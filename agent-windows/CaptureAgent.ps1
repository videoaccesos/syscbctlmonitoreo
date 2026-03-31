<#
.SYNOPSIS
    Agente de captura de frames - archivo unico, autoinstalable.

.DESCRIPTION
    Proceso residente en Windows que:
    - Si no existe config.json, ejecuta un wizard interactivo:
      pide IP del DVR, site_id, explora canales automaticamente y genera config.json
    - Si no esta registrado como Tarea Programada, se autoinstala
    - Permanece idle hasta recibir comandos start_stream / stop_stream via polling HTTP
    - Captura snapshots JPEG desde DVR/camaras locales por LAN (paralelo)
    - Envia los frames al backend central por HTTPS POST

    Solo conexiones salientes. Funciona detras de NAT/CGNAT sin port forwarding.

.NOTES
    Requiere: PowerShell 5.1+, acceso LAN al DVR, acceso a internet (HTTPS)
    Ejecutar como Administrador para autoinstalacion de tarea programada.
    Uso: .\CaptureAgent.ps1
#>

param(
    [string]$ConfigPath = (Join-Path $PSScriptRoot "config.json"),
    [switch]$Uninstall
)

$TaskName = "VideoAccesos-CaptureAgent"

# ============================================================================
# DESINSTALACION
# ============================================================================
if ($Uninstall) {
    Write-Host "Desinstalando tarea programada..." -ForegroundColor Yellow
    Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
    Unregister-ScheduledTask -TaskName "VideoAccesos-MqttListener" -Confirm:$false -ErrorAction SilentlyContinue
    Write-Host "Tarea eliminada." -ForegroundColor Green
    Write-Host "Para eliminar config.json y logs, borre manualmente la carpeta." -ForegroundColor Gray
    exit 0
}

# ============================================================================
# SETUP WIZARD - Genera config.json si no existe
# ============================================================================
function Run-SetupWizard {
    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host "  VideoAccesos - Configuracion del Agente " -ForegroundColor Cyan
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "No se encontro config.json. Vamos a configurar el agente." -ForegroundColor Yellow
    Write-Host ""

    # --- Pedir datos basicos ---
    $siteId = Read-Host "ID de la privada (site_id, ej: 70)"
    while (-not $siteId) {
        Write-Host "  El site_id es obligatorio." -ForegroundColor Red
        $siteId = Read-Host "ID de la privada (site_id)"
    }

    $dvrIp = Read-Host "IP del DVR en la red local (ej: 192.168.1.64)"
    while (-not $dvrIp) {
        Write-Host "  La IP del DVR es obligatoria." -ForegroundColor Red
        $dvrIp = Read-Host "IP del DVR"
    }

    $username = Read-Host "Usuario del DVR [admin]"
    if (-not $username) { $username = "admin" }

    $password = Read-Host "Contrasena del DVR [v1de0acces0s]"
    if (-not $password) { $password = "v1de0acces0s" }

    $backendUrl = Read-Host "URL del backend [https://accesoswhatsapp.info/api/camera-frames]"
    if (-not $backendUrl) { $backendUrl = "https://accesoswhatsapp.info/api/camera-frames" }

    $agentToken = Read-Host "Token del agente [b7f9dee88d9e9d141557ef6227a351048df0d105b71dfd00cdda483d7d347c47]"
    if (-not $agentToken) { $agentToken = "b7f9dee88d9e9d141557ef6227a351048df0d105b71dfd00cdda483d7d347c47" }

    # --- Explorar DVR ---
    Write-Host ""
    Write-Host "Explorando DVR en $dvrIp ..." -ForegroundColor Cyan

    $secPass = ConvertTo-SecureString $password -AsPlainText -Force
    $cred = New-Object System.Management.Automation.PSCredential($username, $secPass)

    # Info del dispositivo
    try {
        $devInfo = Invoke-WebRequest -Uri "http://${dvrIp}/ISAPI/System/deviceInfo" -Credential $cred -TimeoutSec 5 -UseBasicParsing
        if ($devInfo.Content -match "<deviceName>(.*?)</deviceName>") { Write-Host "  Dispositivo: $($Matches[1])" -ForegroundColor Green }
        if ($devInfo.Content -match "<model>(.*?)</model>") { Write-Host "  Modelo:      $($Matches[1])" -ForegroundColor Green }
    } catch {
        Write-Host "  No se pudo obtener info del dispositivo" -ForegroundColor Yellow
    }

    # Obtener nombres de canales
    $channelNames = @{}
    try {
        $channels = Invoke-WebRequest -Uri "http://${dvrIp}/ISAPI/System/Video/inputs/channels" -Credential $cred -TimeoutSec 5 -UseBasicParsing
        $xml = [xml]$channels.Content
        foreach ($ch in $xml.VideoInputChannelList.VideoInputChannel) {
            if ($ch.id -and $ch.name) { $channelNames[[int]$ch.id] = $ch.name }
        }
    } catch {}
    try {
        $ipCh = Invoke-WebRequest -Uri "http://${dvrIp}/ISAPI/ContentMgmt/InputProxy/channels" -Credential $cred -TimeoutSec 5 -UseBasicParsing
        $xml2 = [xml]$ipCh.Content
        foreach ($ch in $xml2.InputProxyChannelList.InputProxyChannel) {
            if ($ch.id -and $ch.name) { $channelNames[[int]$ch.id] = $ch.name }
        }
    } catch {}

    # Probar canales 1-16 (sub-stream)
    Write-Host ""
    $cameras = @()
    for ($ch = 1; $ch -le 16; $ch++) {
        $chCode = "${ch}02"
        $url = "http://${dvrIp}/ISAPI/Streaming/channels/${chCode}/picture"
        try {
            $r = Invoke-WebRequest -Uri $url -Credential $cred -TimeoutSec 5 -UseBasicParsing
            if ($r.StatusCode -eq 200 -and $r.Content.Length -gt 500) {
                $name = if ($channelNames.ContainsKey($ch)) { $channelNames[$ch] } else { "Canal $ch" }
                $sizeKb = [math]::Round($r.Content.Length / 1024, 1)
                Write-Host "  Canal $ch ($name): OK [${sizeKb} KB]" -ForegroundColor Green
                $cameras += @{
                    cam_id = $ch
                    alias = $name
                    snapshot_url = $url
                    username = $username
                    password = $password
                    auth_type = "digest"
                }
            } else {
                Write-Host "  Canal ${ch}: sin imagen" -ForegroundColor DarkGray
            }
        } catch {
            Write-Host "  Canal ${ch}: no disponible" -ForegroundColor DarkGray
        }
    }

    if ($cameras.Count -eq 0) {
        Write-Host ""
        Write-Host "ERROR: No se encontraron canales con imagen en el DVR." -ForegroundColor Red
        Write-Host "Verifique la IP, usuario y contrasena." -ForegroundColor Red
        exit 1
    }

    Write-Host ""
    Write-Host "$($cameras.Count) canales con imagen encontrados." -ForegroundColor Green

    # --- Generar config.json ---
    $config = @{
        site_id = $siteId
        agent_token = $agentToken
        backend_url = $backendUrl
        cameras = $cameras
        defaults = @{
            auto_start = $false
            fps = 25
            quality = 55
            width = 640
            max_duration_sec = 0
            heartbeat_interval_sec = 30
        }
        log = @{
            path = "logs"
            max_size_mb = 10
            level = "INFO"
        }
    }

    $json = $config | ConvertTo-Json -Depth 4
    Set-Content -Path $ConfigPath -Value $json -Encoding UTF8

    Write-Host ""
    Write-Host "config.json generado en: $ConfigPath" -ForegroundColor Green
    Write-Host ""
}

# ============================================================================
# AUTO-INSTALACION como Tarea Programada
# ============================================================================
function Install-AsScheduledTask {
    $existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    if ($existing) {
        # Ya esta instalada
        return $true
    }

    # Verificar admin
    $isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
        [Security.Principal.WindowsBuiltInRole]::Administrator
    )
    if (-not $isAdmin) {
        Write-Host ""
        Write-Host "AVISO: Para instalar la tarea programada, ejecute como Administrador." -ForegroundColor Yellow
        Write-Host "El agente funcionara en esta sesion pero NO arrancara automaticamente." -ForegroundColor Yellow
        Write-Host ""
        return $false
    }

    Write-Host "Instalando como tarea programada..." -ForegroundColor Cyan

    # Limpiar tarea legacy si existe
    Unregister-ScheduledTask -TaskName "VideoAccesos-MqttListener" -Confirm:$false -ErrorAction SilentlyContinue

    $scriptPath = Join-Path $PSScriptRoot "CaptureAgent.ps1"

    $settings = New-ScheduledTaskSettingsSet `
        -AllowStartIfOnBatteries `
        -DontStopIfGoingOnBatteries `
        -StartWhenAvailable `
        -RestartCount 999 `
        -RestartInterval (New-TimeSpan -Minutes 1) `
        -ExecutionTimeLimit (New-TimeSpan -Days 365) `
        -MultipleInstances IgnoreNew

    # Dos triggers:
    # 1. Al iniciar el sistema
    # 2. Repeticion cada 3 minutos indefinidamente (watchdog: si muere, se relanza)
    $triggerStartup = New-ScheduledTaskTrigger -AtStartup
    $triggerRepeat  = New-ScheduledTaskTrigger -Once -At (Get-Date) `
        -RepetitionInterval (New-TimeSpan -Minutes 3) `
        -RepetitionDuration (New-TimeSpan -Days 9999)

    $action = New-ScheduledTaskAction `
        -Execute "powershell.exe" `
        -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$scriptPath`"" `
        -WorkingDirectory $PSScriptRoot

    Register-ScheduledTask `
        -TaskName $TaskName `
        -Action $action `
        -Trigger @($triggerStartup, $triggerRepeat) `
        -Settings $settings `
        -User "SYSTEM" `
        -RunLevel Highest `
        -Description "VideoAccesos: Agente de captura de frames DVR. Se relanza automaticamente cada 3 min si se detiene."

    Write-Host "Tarea '$TaskName' registrada OK." -ForegroundColor Green
    Write-Host "Arrancara automaticamente al iniciar Windows." -ForegroundColor Green
    Write-Host "Si se detiene, se relanzara en maximo 3 minutos." -ForegroundColor Green
    Write-Host ""
    Write-Host "Comandos utiles:" -ForegroundColor Gray
    Write-Host "  Iniciar:     Start-ScheduledTask '$TaskName'"
    Write-Host "  Detener:     Stop-ScheduledTask '$TaskName'"
    Write-Host "  Reiniciar:   Stop-ScheduledTask '$TaskName'; Start-Sleep 3; Start-ScheduledTask '$TaskName'"
    Write-Host "  Estado:      Get-ScheduledTask -TaskName '$TaskName' | Format-Table TaskName, State"
    Write-Host "  Desinstalar: .\CaptureAgent.ps1 -Uninstall"
    Write-Host "  Ver logs:    Get-Content $PSScriptRoot\logs\*.log -Tail 20"
    Write-Host ""

    return $true
}

# ============================================================================
# CONFIGURACION Y ESTADO GLOBAL
# ============================================================================
$ErrorActionPreference = "Continue"

$script:Config = $null
$script:AgentState = "starting"
$script:StreamingCams = @{}
$script:StreamTimeout = @{}
$script:StopRequested = $false
$script:LogFile = $null
$script:DiscoveredCameras = @()

# ============================================================================
# LOGGING
# ============================================================================
function Write-Log {
    param([string]$Level, [string]$Message)
    $ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss.fff"
    $line = "[$ts] [$Level] $Message"
    Write-Host $line
    if ($script:LogFile) {
        try { Add-Content -Path $script:LogFile -Value $line -ErrorAction SilentlyContinue } catch {}
    }
}

function Log-Info  { param([string]$Msg) Write-Log "INFO"  $Msg }
function Log-Warn  { param([string]$Msg) Write-Log "WARN"  $Msg }
function Log-Error { param([string]$Msg) Write-Log "ERROR" $Msg }
function Log-Debug { param([string]$Msg) if ($script:Config.log.level -eq "DEBUG") { Write-Log "DEBUG" $Msg } }

# ============================================================================
# AUTO-EXPLORACION DEL DVR
# ============================================================================
function Explore-DVR {
    $baseCam = $script:Config.cameras[0]
    if (-not $baseCam) {
        Log-Warn "No hay camaras configuradas, no se puede explorar DVR"
        return
    }

    $dvrIp = $null
    if ($baseCam.snapshot_url -match "http://([^/]+)") {
        $dvrIp = $Matches[1]
    }
    if (-not $dvrIp) {
        Log-Warn "No se pudo extraer IP del DVR"
        return
    }

    $username = $baseCam.username
    $password = $baseCam.password
    $secPass = ConvertTo-SecureString $password -AsPlainText -Force
    $cred = New-Object System.Management.Automation.PSCredential($username, $secPass)

    Log-Info "=== Explorando DVR en $dvrIp ==="

    $channelNames = @{}
    try {
        $channels = Invoke-WebRequest -Uri "http://${dvrIp}/ISAPI/System/Video/inputs/channels" -Credential $cred -TimeoutSec 5 -UseBasicParsing
        $xml = [xml]$channels.Content
        foreach ($ch in $xml.VideoInputChannelList.VideoInputChannel) {
            if ($ch.id -and $ch.name) { $channelNames[[int]$ch.id] = $ch.name }
        }
    } catch {}
    try {
        $ipCh = Invoke-WebRequest -Uri "http://${dvrIp}/ISAPI/ContentMgmt/InputProxy/channels" -Credential $cred -TimeoutSec 5 -UseBasicParsing
        $xml2 = [xml]$ipCh.Content
        foreach ($ch in $xml2.InputProxyChannelList.InputProxyChannel) {
            if ($ch.id -and $ch.name) { $channelNames[[int]$ch.id] = $ch.name }
        }
    } catch {}

    $discovered = @()
    for ($ch = 1; $ch -le 16; $ch++) {
        $chCode = "${ch}02"
        $url = "http://${dvrIp}/ISAPI/Streaming/channels/${chCode}/picture"
        try {
            $r = Invoke-WebRequest -Uri $url -Credential $cred -TimeoutSec 5 -UseBasicParsing
            if ($r.StatusCode -eq 200 -and $r.Content.Length -gt 500) {
                $name = if ($channelNames.ContainsKey($ch)) { $channelNames[$ch] } else { "Canal $ch" }
                $sizeKb = [math]::Round($r.Content.Length / 1024, 1)
                Log-Info "  Canal $ch ($name): OK [${sizeKb} KB] -> $chCode"
                $discovered += @{
                    channel = $ch
                    code = $chCode
                    alias = $name
                    snapshot_url = $url
                    username = $username
                    password = $password
                    auth_type = "digest"
                    bytes = $r.Content.Length
                }
            }
        } catch {}
    }

    $script:DiscoveredCameras = $discovered
    Log-Info "DVR explorado: $($discovered.Count) canales con imagen"

    Report-Channels
}

function Report-Channels {
    if ($script:DiscoveredCameras.Count -eq 0) { return }

    $baseUrl = $script:Config.backend_url -replace '/+$', ''
    $reportUrl = "$baseUrl/channels"

    $channels = @()
    foreach ($cam in $script:DiscoveredCameras) {
        $channels += @{
            channel = $cam.channel
            code = $cam.code
            alias = $cam.alias
            bytes = $cam.bytes
        }
    }

    $body = @{
        site_id = $script:Config.site_id
        channels = $channels
    } | ConvertTo-Json -Depth 3

    try {
        $request = [System.Net.HttpWebRequest]::Create($reportUrl)
        $request.Method = "POST"
        $request.ContentType = "application/json"
        $request.Timeout = 10000
        $request.Headers.Add("X-Agent-Token", $script:Config.agent_token)
        $request.UserAgent = "CaptureAgent/1.0"

        $bytes = [System.Text.Encoding]::UTF8.GetBytes($body)
        $request.ContentLength = $bytes.Length
        $reqStream = $request.GetRequestStream()
        $reqStream.Write($bytes, 0, $bytes.Length)
        $reqStream.Close()

        $response = $request.GetResponse()
        $response.Close()
        Log-Info "Canales reportados al servidor OK"
    } catch {
        Log-Warn "Error reportando canales: $($_.Exception.Message)"
    }
}

# ============================================================================
# INICIALIZACION
# ============================================================================
function Initialize-Agent {
    $script:Config = Get-Content $ConfigPath -Raw | ConvertFrom-Json

    # Crear directorio de logs
    $logDir = Join-Path $PSScriptRoot $script:Config.log.path
    if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir -Force | Out-Null }

    # Rotacion de logs: eliminar archivos con mas de 7 dias
    try {
        $cutoff = (Get-Date).AddDays(-7)
        Get-ChildItem -Path $logDir -Filter "agent-*.log" -ErrorAction SilentlyContinue |
            Where-Object { $_.LastWriteTime -lt $cutoff } |
            ForEach-Object {
                Remove-Item $_.FullName -Force -ErrorAction SilentlyContinue
            }
    } catch {}

    $logDate = Get-Date -Format "yyyy-MM-dd"
    $script:LogFile = Join-Path $logDir "agent-$logDate.log"

    Log-Info "=== Agente de captura iniciando ==="
    Log-Info "Site ID: $($script:Config.site_id)"
    Log-Info "Backend: $($script:Config.backend_url)"
    Log-Info "Camaras configuradas: $($script:Config.cameras.Count)"

    foreach ($cam in $script:Config.cameras) {
        Log-Info "  Cam $($cam.cam_id): $($cam.alias) -> $($cam.snapshot_url)"
    }

    Initialize-PollUrl
    Initialize-RunspacePool
    Explore-DVR

    $script:AgentState = "idle"
    Log-Info "Agente en estado IDLE - esperando comandos via polling HTTP"

    if ($script:Config.defaults.auto_start -eq $true) {
        $fps = $script:Config.defaults.fps
        Log-Info "AUTO-START habilitado: iniciando todas las camaras a ${fps} FPS"
        foreach ($cam in $script:Config.cameras) {
            Start-CameraStream -CamId $cam.cam_id -Fps $fps -DurationSec 0
        }
    }
}

# ============================================================================
# POLLING HTTP para comandos
# ============================================================================
$script:PollUrl = $null
$script:LastPollTime = [DateTime]::MinValue
$script:PollIntervalSec = 1

function Initialize-PollUrl {
    $baseUrl = $script:Config.backend_url -replace '/+$', ''
    $script:PollUrl = "$baseUrl/poll?site_id=$($script:Config.site_id)"
    Log-Info "Poll URL: $($script:PollUrl)"
}

function Get-PendingCommands {
    if (((Get-Date) - $script:LastPollTime).TotalSeconds -lt $script:PollIntervalSec) {
        return @()
    }
    $script:LastPollTime = Get-Date

    $response = $null
    $reader = $null
    try {
        $request = [System.Net.HttpWebRequest]::Create($script:PollUrl)
        $request.Method = "GET"
        $request.Timeout = 5000
        $request.KeepAlive = $false  # No reutilizar conexion (evita pool stale)
        $request.Headers.Add("X-Agent-Token", $script:Config.agent_token)
        $request.UserAgent = "CaptureAgent/1.0"

        $response = $request.GetResponse()
        $reader = New-Object System.IO.StreamReader($response.GetResponseStream())
        $body = $reader.ReadToEnd()

        $result = $body | ConvertFrom-Json

        if ($result.commands -and $result.commands.Count -gt 0) {
            Log-Info "Poll: $($result.commands.Count) comando(s) recibido(s)"
            foreach ($cmd in $result.commands) {
                Log-Info "  Comando: $($cmd.cmd)"
            }
            return $result.commands
        }
    } catch {
        Log-Debug "Poll error: $($_.Exception.Message)"
        return $null  # null = error, distinguir de @() = exito sin comandos
    } finally {
        if ($reader) { try { $reader.Close(); $reader.Dispose() } catch {} }
        if ($response) { try { $response.Close(); $response.Dispose() } catch {} }
    }
    return @()
}

function Process-Command {
    param([object]$Cmd)

    switch ($Cmd.cmd) {
        "start_stream" {
            $fps = if ($Cmd.fps) { [double]$Cmd.fps } else { $script:Config.defaults.fps }
            $duration = if ($Cmd.duration) { [int]$Cmd.duration } else { $script:Config.defaults.max_duration_sec }
            $camId = if ($Cmd.cam_id) { [int]$Cmd.cam_id } else { 0 }
            $mode = if ($Cmd.mode) { $Cmd.mode } else { "configured" }

            if ($mode -eq "all" -and $script:DiscoveredCameras.Count -gt 0) {
                Log-Info "start_stream mode=all: iniciando $($script:DiscoveredCameras.Count) canales descubiertos"
                foreach ($cam in $script:DiscoveredCameras) {
                    Start-CameraStream -CamId $cam.channel -Fps $fps -DurationSec $duration
                }
            } elseif ($camId -gt 0) {
                Start-CameraStream -CamId $camId -Fps $fps -DurationSec $duration
            } else {
                foreach ($cam in $script:Config.cameras) {
                    Start-CameraStream -CamId $cam.cam_id -Fps $fps -DurationSec $duration
                }
            }
        }
        "stop_stream" {
            $camId = if ($Cmd.cam_id) { [int]$Cmd.cam_id } else { 0 }
            if ($camId -gt 0) {
                Stop-CameraStream -CamId $camId
            } else {
                foreach ($camKey in @($script:StreamingCams.Keys)) {
                    Stop-CameraStream -CamId $camKey
                }
            }
        }
        default {
            Log-Warn "Comando desconocido: $($Cmd.cmd)"
        }
    }
}

# ============================================================================
# CONTROL DE STREAMING
# ============================================================================
function Start-CameraStream {
    param([int]$CamId, [double]$Fps, [int]$DurationSec)

    $script:StreamingCams[$CamId] = @{
        fps = $Fps
        started = Get-Date
        frameCount = 0
        errorCount = 0
    }
    if ($DurationSec -gt 0) {
        $script:StreamTimeout[$CamId] = (Get-Date).AddSeconds($DurationSec)
    } else {
        $script:StreamTimeout.Remove($CamId)
    }
    $script:AgentState = "streaming"

    $durLabel = if ($DurationSec -gt 0) { "${DurationSec}s" } else { "continuo" }
    Log-Info "STREAM START: cam=$CamId fps=$Fps duration=$durLabel"
}

function Stop-CameraStream {
    param([int]$CamId)

    if ($script:StreamingCams.ContainsKey($CamId)) {
        $info = $script:StreamingCams[$CamId]
        $elapsed = ((Get-Date) - $info.started).TotalSeconds
        Log-Info "STREAM STOP: cam=$CamId frames=$($info.frameCount) errors=$($info.errorCount) elapsed=$([int]$elapsed)s"
        $script:StreamingCams.Remove($CamId)
    }
    $script:StreamTimeout.Remove($CamId)

    if ($script:StreamingCams.Count -eq 0) {
        $script:AgentState = "idle"
        Log-Info "Agente regresa a estado IDLE"
    }
}

# ============================================================================
# CAPTURA PARALELA con RunspacePool
# ============================================================================
$script:CaptureScriptBlock = {
    param(
        [string]$SnapshotUrl,
        [string]$Username,
        [string]$Password,
        [string]$AuthType,
        [string]$BackendUrl,
        [string]$SiteId,
        [int]$CamId,
        [string]$AgentToken,
        [double]$Fps
    )

    try {
        [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12
        [System.Net.ServicePointManager]::ServerCertificateValidationCallback = { $true }

        # Capturar snapshot usando Invoke-WebRequest (maneja Digest auth en runspaces)
        $secPass = ConvertTo-SecureString $Password -AsPlainText -Force
        $psCred = New-Object System.Management.Automation.PSCredential($Username, $secPass)

        $snapResponse = Invoke-WebRequest -Uri $SnapshotUrl -Credential $psCred -TimeoutSec 4 -UseBasicParsing
        if ($snapResponse.StatusCode -eq 200 -and $snapResponse.Content.Length -gt 100) {
            $frameData = $snapResponse.Content
        } else {
            return @{ ok = $false; camId = $CamId; error = "Frame vacio o status $($snapResponse.StatusCode)" }
        }

        # Enviar al backend
        $request = [System.Net.HttpWebRequest]::Create($BackendUrl)
        $request.Method = "POST"
        $request.ContentType = "image/jpeg"
        $request.ContentLength = $frameData.Length
        $request.Timeout = 5000
        $request.Headers.Add("X-Site-Id", $SiteId)
        $request.Headers.Add("X-Cam-Id", $CamId.ToString())
        $request.Headers.Add("X-Agent-Token", $AgentToken)
        $request.Headers.Add("X-Agent-Host", [System.Net.Dns]::GetHostName())
        $request.Headers.Add("X-Agent-Fps", $Fps.ToString("F1"))
        $request.UserAgent = "CaptureAgent/1.0"

        $reqStream = $request.GetRequestStream()
        $reqStream.Write($frameData, 0, $frameData.Length)
        $reqStream.Close()

        $response = $request.GetResponse()
        $status = [int]$response.StatusCode
        $response.Close()

        return @{ ok = $true; camId = $CamId; bytes = $frameData.Length; status = $status }
    } catch {
        return @{ ok = $false; camId = $CamId; error = $_.Exception.Message }
    }
}

$script:RunspacePool = $null
$script:CaptureCount = 0
$script:PoolRecycleEvery = 500  # Reciclar RunspacePool cada N ciclos

function Initialize-RunspacePool {
    if ($script:RunspacePool) {
        try { $script:RunspacePool.Close() } catch {}
        try { $script:RunspacePool.Dispose() } catch {}
    }
    $maxThreads = [Math]::Max($script:Config.cameras.Count, 4)
    $maxThreads = [Math]::Min($maxThreads, 16)
    $script:RunspacePool = [runspacefactory]::CreateRunspacePool(1, $maxThreads)
    $script:RunspacePool.Open()
    $script:CaptureCount = 0
    Log-Info "RunspacePool inicializado: max=$maxThreads threads"
}

function Invoke-CaptureLoop {
    # Reciclar RunspacePool cada N ciclos para evitar memory leak
    $script:CaptureCount++
    if ($script:CaptureCount -ge $script:PoolRecycleEvery) {
        Log-Info "Reciclando RunspacePool despues de $($script:CaptureCount) ciclos..."
        Initialize-RunspacePool
        [System.GC]::Collect()
        [System.GC]::WaitForPendingFinalizers()
    }

    # Construir mapa de configs: config.json + descubiertas
    $camConfigs = @{}
    foreach ($cam in $script:Config.cameras) {
        $camConfigs[$cam.cam_id] = $cam
    }
    foreach ($cam in $script:DiscoveredCameras) {
        if (-not $camConfigs.ContainsKey($cam.channel)) {
            $camConfigs[$cam.channel] = @{
                cam_id = $cam.channel
                alias = $cam.alias
                snapshot_url = $cam.snapshot_url
                username = $cam.username
                password = $cam.password
                auth_type = $cam.auth_type
            }
        }
    }

    # Verificar timeouts
    foreach ($camId in @($script:StreamingCams.Keys)) {
        if ($script:StreamTimeout.ContainsKey($camId)) {
            if ((Get-Date) -gt $script:StreamTimeout[$camId]) {
                Log-Info "Timeout alcanzado para cam=$camId"
                Stop-CameraStream -CamId $camId
            }
        }
    }

    if ($script:StreamingCams.Count -eq 0) { return }

    # Lanzar captura paralela
    $jobs = @()
    foreach ($camId in @($script:StreamingCams.Keys)) {
        $streamInfo = $script:StreamingCams[$camId]
        if (-not $streamInfo) { continue }
        $camConfig = $camConfigs[$camId]
        if (-not $camConfig) { continue }

        $ps = [powershell]::Create()
        $ps.RunspacePool = $script:RunspacePool
        $ps.AddScript($script:CaptureScriptBlock).AddParameters(@{
            SnapshotUrl = $camConfig.snapshot_url
            Username    = $camConfig.username
            Password    = $camConfig.password
            AuthType    = if ($camConfig.auth_type) { $camConfig.auth_type } else { "digest" }
            BackendUrl  = $script:Config.backend_url
            SiteId      = $script:Config.site_id
            CamId       = $camId
            AgentToken  = $script:Config.agent_token
            Fps         = $streamInfo.fps
        }) | Out-Null

        $handle = $ps.BeginInvoke()
        $jobs += @{ ps = $ps; handle = $handle; camId = $camId }
    }

    # Esperar a que terminen (timeout 6s)
    $deadline = (Get-Date).AddSeconds(6)
    foreach ($job in $jobs) {
        $remaining = ($deadline - (Get-Date)).TotalMilliseconds
        if ($remaining -gt 0) {
            $job.handle.AsyncWaitHandle.WaitOne([int]$remaining) | Out-Null
        }

        if ($job.handle.IsCompleted) {
            $result = $job.ps.EndInvoke($job.handle)
            if ($result -and $result.Count -gt 0) {
                $r = $result[0]
                $info = $script:StreamingCams[$job.camId]
                if ($r.ok) {
                    if ($info) { $info.frameCount++ }
                    Log-Debug "cam=$($job.camId) OK bytes=$($r.bytes)"
                } else {
                    if ($info) { $info.errorCount++ }
                    if ($info -and $info.errorCount % 10 -eq 0) {
                        Log-Warn "cam=$($job.camId) error: $($r.error) (total=$($info.errorCount))"
                    }
                }
            }
        } else {
            Log-Warn "cam=$($job.camId) timeout en captura paralela"
        }
        $job.ps.Dispose()
    }
}

# ============================================================================
# HEARTBEAT
# ============================================================================
$script:LastHeartbeat = [DateTime]::MinValue

function Send-Heartbeat {
    $interval = $script:Config.defaults.heartbeat_interval_sec
    if (((Get-Date) - $script:LastHeartbeat).TotalSeconds -lt $interval) { return }

    $script:LastHeartbeat = Get-Date
    # Memoria del proceso actual
    $proc = [System.Diagnostics.Process]::GetCurrentProcess()
    $memMB = [Math]::Round($proc.WorkingSet64 / 1MB, 1)

    $heartbeat = @{
        agent = "capture-agent"
        state = $script:AgentState
        site_id = $script:Config.site_id
        host = [System.Net.Dns]::GetHostName()
        cameras = $script:Config.cameras.Count
        streaming = $script:StreamingCams.Count
        memory_mb = $memMB
        capture_cycles = $script:CaptureCount
        ts = (Get-Date).ToString("yyyy-MM-ddTHH:mm:sszzz")
    } | ConvertTo-Json -Compress

    Log-Info "Heartbeat: mem=${memMB}MB streaming=$($script:StreamingCams.Count) cycles=$($script:CaptureCount)"
}

# ============================================================================
# LOOP PRINCIPAL
# ============================================================================
$script:LoopIteration = 0
$script:LastGC = [DateTime]::MinValue
$script:LastLogRotate = [DateTime]::MinValue
$script:LastSuccessfulPoll = [DateTime]::Now
$script:WatchdogMaxSilence = 120  # Si no hay poll exitoso en 2 min, auto-reiniciar

function Start-AgentLoop {
    Log-Info "Iniciando loop principal..."

    while (-not $script:StopRequested) {
        try {
            $script:LoopIteration++

            $cmds = Get-PendingCommands
            if ($null -ne $cmds) {
                # Poll fue exitoso (null = error de red, @() = exito sin comandos)
                $script:LastSuccessfulPoll = Get-Date
                if ($cmds.Count -gt 0) {
                    # Solo procesar el ULTIMO comando: si llegan start,stop,start,stop
                    # acumulados, solo importa el final
                    $lastCmd = $cmds[$cmds.Count - 1]
                    if ($cmds.Count -gt 1) {
                        Log-Info "Descartando $($cmds.Count - 1) comando(s) obsoletos, ejecutando solo: $($lastCmd.cmd)"
                    }
                    Process-Command -Cmd $lastCmd
                }
            }

            if ($script:StreamingCams.Count -gt 0) {
                Invoke-CaptureLoop
                Start-Sleep -Milliseconds 40
            } else {
                Start-Sleep -Milliseconds 1000
            }

            Send-Heartbeat

            # Watchdog: si no hubo poll exitoso en 2 min, forzar reinicio
            $silenceSec = ((Get-Date) - $script:LastSuccessfulPoll).TotalSeconds
            if ($silenceSec -gt $script:WatchdogMaxSilence) {
                Log-Error "WATCHDOG: sin poll exitoso por ${silenceSec}s - forzando reinicio"
                throw "Watchdog timeout: sin comunicacion con servidor por ${silenceSec}s"
            }

            # GC cada 5 minutos para liberar memoria
            if (((Get-Date) - $script:LastGC).TotalMinutes -ge 5) {
                $script:LastGC = Get-Date
                [System.GC]::Collect()
                [System.GC]::WaitForPendingFinalizers()
            }

            # Rotar archivo de log a medianoche
            $today = Get-Date -Format "yyyy-MM-dd"
            $currentLogName = "agent-$today.log"
            $logDir = Join-Path $PSScriptRoot $script:Config.log.path
            $expectedPath = Join-Path $logDir $currentLogName
            if ($script:LogFile -ne $expectedPath) {
                Log-Info "Rotando log -> $currentLogName"
                $script:LogFile = $expectedPath
            }

        } catch {
            Log-Error "Error en loop principal: $($_.Exception.Message)"
            Start-Sleep -Seconds 5
        }
    }

    Log-Info "=== Agente detenido ==="
}

# ============================================================================
# PUNTO DE ENTRADA
# ============================================================================

# Manejar Ctrl+C
try { [Console]::TreatControlCAsInput = $false } catch {}
trap {
    $script:StopRequested = $true
    continue
}

# TLS 1.2 + aumentar limite de conexiones (evita deadlock del connection pool)
try {
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12
    [System.Net.ServicePointManager]::DefaultConnectionLimit = 50
} catch {}

# --- PASO 1: Si no existe config.json, ejecutar wizard ---
if (-not (Test-Path $ConfigPath)) {
    Run-SetupWizard
}

# --- PASO 2: Auto-instalar como tarea programada ---
Install-AsScheduledTask

# --- PASO 3: Verificar que no haya otra instancia corriendo ---
$lockFile = Join-Path $PSScriptRoot "agent.lock"
$lockPid = $null
if (Test-Path $lockFile) {
    $lockPid = Get-Content $lockFile -ErrorAction SilentlyContinue
    if ($lockPid) {
        $existingProc = Get-Process -Id ([int]$lockPid) -ErrorAction SilentlyContinue
        if ($existingProc -and $existingProc.ProcessName -eq "powershell") {
            Write-Host "Agente ya corriendo (PID $lockPid). Saliendo." -ForegroundColor Yellow
            exit 0
        }
    }
}
# Escribir nuestro PID
$PID | Set-Content $lockFile -Force

# Limpiar lock al salir
$exitHandler = {
    Remove-Item $lockFile -Force -ErrorAction SilentlyContinue
}
Register-EngineEvent -SourceIdentifier PowerShell.Exiting -Action $exitHandler -ErrorAction SilentlyContinue | Out-Null

# --- PASO 4: Arrancar el agente con auto-reinicio ---
$restartCount = 0
$maxRestarts = 100  # Limite de reinicios antes de salir (la tarea programada lo relanzara)

while ($restartCount -lt $maxRestarts) {
    try {
        Initialize-Agent
        Start-AgentLoop
        # Si llega aqui es porque StopRequested = true (salida limpia)
        break
    } catch {
        $restartCount++
        $errMsg = $_.Exception.Message
        try { Log-Error "CRASH #${restartCount}: $errMsg" } catch {}
        Write-Host "ERROR FATAL #${restartCount}: $errMsg" -ForegroundColor Red
        Write-Host "Reiniciando en 10 segundos..." -ForegroundColor Yellow

        # Limpiar RunspacePool si existe
        if ($script:RunspacePool) {
            try { $script:RunspacePool.Close() } catch {}
            try { $script:RunspacePool.Dispose() } catch {}
            $script:RunspacePool = $null
        }
        $script:StreamingCams = @{}
        $script:StreamTimeout = @{}

        [System.GC]::Collect()
        [System.GC]::WaitForPendingFinalizers()
        Start-Sleep -Seconds 10
    }
}

# Limpiar lock
Remove-Item $lockFile -Force -ErrorAction SilentlyContinue

if ($restartCount -ge $maxRestarts) {
    try { Log-Error "Limite de reinicios alcanzado ($maxRestarts). Saliendo para que la tarea programada relance." } catch {}
    exit 1  # Exit con error para que RestartOnFailure lo relance
}
