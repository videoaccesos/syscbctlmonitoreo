<#
.SYNOPSIS
    Agente de captura de frames bajo demanda para sitios remotos.

.DESCRIPTION
    Proceso residente en Windows que:
    - Se conecta a un broker MQTT y escucha comandos start_stream / stop_stream
    - Permanece idle con bajo consumo hasta recibir instruccion
    - Captura snapshots JPEG desde DVR/camaras locales por LAN
    - Envia los frames al backend central por HTTPS POST
    - Publica heartbeat, estado y errores por MQTT
    - Se detiene por comando o por timeout automatico

    Diseñado para funcionar detras de NAT/CGNAT sin necesidad de port forwarding,
    IP publica ni tuneles. Solo usa conexiones salientes.

.NOTES
    Requiere: PowerShell 5.1+, acceso LAN al DVR, acceso a internet (HTTPS + MQTT)
    Archivo de configuracion: config.json (junto al script)
#>

param(
    [string]$ConfigPath = (Join-Path $PSScriptRoot "config.json")
)

# ---------------------------------------------------------------------------
# Configuracion y estado global
# ---------------------------------------------------------------------------
$ErrorActionPreference = "Continue"

$script:Config = $null
$script:AgentState = "starting"  # starting, idle, streaming, error
$script:StreamingCams = @{}      # cam_id -> $true si esta transmitiendo
$script:StreamTimeout = @{}      # cam_id -> DateTime de fin
$script:StopRequested = $false
$script:LogFile = $null

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
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

# ---------------------------------------------------------------------------
# Auto-exploracion del DVR: detecta canales activos
# ---------------------------------------------------------------------------
$script:DiscoveredCameras = @()

function Explore-DVR {
    # Obtener IP base y credenciales del primer camera config
    $baseCam = $script:Config.cameras[0]
    if (-not $baseCam) {
        Log-Warn "No hay camaras configuradas, no se puede explorar DVR"
        return
    }

    # Extraer IP del DVR de la primera URL
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
        } catch {
            # Canal no disponible - ignorar
        }
    }

    $script:DiscoveredCameras = $discovered
    Log-Info "DVR explorado: $($discovered.Count) canales con imagen"

    # Reportar canales al servidor
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

# ---------------------------------------------------------------------------
# Inicializacion
# ---------------------------------------------------------------------------
function Initialize-Agent {
    # Cargar configuracion
    if (-not (Test-Path $ConfigPath)) {
        Write-Error "Config no encontrado: $ConfigPath"
        exit 1
    }

    $script:Config = Get-Content $ConfigPath -Raw | ConvertFrom-Json

    # Crear directorio de logs
    $logDir = Join-Path $PSScriptRoot $script:Config.log.path
    if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir -Force | Out-Null }

    $logDate = Get-Date -Format "yyyy-MM-dd"
    $script:LogFile = Join-Path $logDir "agent-$logDate.log"

    Log-Info "=== Agente de captura iniciando ==="
    Log-Info "Site ID: $($script:Config.site_id)"
    Log-Info "Backend: $($script:Config.backend_url)"
    Log-Info "Camaras configuradas: $($script:Config.cameras.Count)"
    Log-Info "Config: $ConfigPath"

    foreach ($cam in $script:Config.cameras) {
        Log-Info "  Cam $($cam.cam_id): $($cam.alias) -> $($cam.snapshot_url)"
    }

    # Inicializar URL de polling y pool de threads
    Initialize-PollUrl
    Initialize-RunspacePool

    # Explorar DVR para descubrir todos los canales disponibles
    Explore-DVR

    $script:AgentState = "idle"
    Log-Info "Agente en estado IDLE - esperando comandos via polling HTTP"

    # Auto-start: si esta configurado, iniciar streaming automaticamente
    if ($script:Config.defaults.auto_start -eq $true) {
        $fps = $script:Config.defaults.fps
        Log-Info "AUTO-START habilitado: iniciando todas las camaras a ${fps} FPS (continuo)"
        foreach ($cam in $script:Config.cameras) {
            Start-CameraStream -CamId $cam.cam_id -Fps $fps -DurationSec 0
        }
    }
}

# ---------------------------------------------------------------------------
# Captura de snapshot con Digest Auth
# ---------------------------------------------------------------------------
function Get-SnapshotDigest {
    param(
        [string]$Url,
        [string]$Username,
        [string]$Password,
        [int]$TimeoutSec = 8
    )

    try {
        # Primer request - obtener challenge 401
        $initialRequest = [System.Net.HttpWebRequest]::Create($Url)
        $initialRequest.Method = "GET"
        $initialRequest.Timeout = $TimeoutSec * 1000
        $initialRequest.UserAgent = "CaptureAgent/1.0"

        try {
            $response = $initialRequest.GetResponse()
            # Si responde 200 directamente (sin auth)
            $stream = $response.GetResponseStream()
            $ms = New-Object System.IO.MemoryStream
            $stream.CopyTo($ms)
            $response.Close()
            return $ms.ToArray()
        } catch [System.Net.WebException] {
            $webEx = $_.Exception
            if ($webEx.Response -and $webEx.Response.StatusCode -eq [System.Net.HttpStatusCode]::Unauthorized) {
                # Leer WWW-Authenticate header
                $authHeader = $webEx.Response.Headers["WWW-Authenticate"]
                $webEx.Response.Close()

                if (-not $authHeader) {
                    Log-Error "No WWW-Authenticate header en 401"
                    return $null
                }

                # Usar CredentialCache con Digest
                $uri = [System.Uri]$Url
                $credCache = New-Object System.Net.CredentialCache
                $cred = New-Object System.Net.NetworkCredential($Username, $Password)
                $credCache.Add($uri, "Digest", $cred)

                $digestRequest = [System.Net.HttpWebRequest]::Create($Url)
                $digestRequest.Method = "GET"
                $digestRequest.Timeout = $TimeoutSec * 1000
                $digestRequest.Credentials = $credCache
                $digestRequest.PreAuthenticate = $true
                $digestRequest.UserAgent = "CaptureAgent/1.0"

                $response2 = $digestRequest.GetResponse()
                $stream2 = $response2.GetResponseStream()
                $ms2 = New-Object System.IO.MemoryStream
                $stream2.CopyTo($ms2)
                $response2.Close()
                return $ms2.ToArray()
            } else {
                $status = if ($webEx.Response) { $webEx.Response.StatusCode } else { "NoResponse" }
                Log-Error "HTTP error: $status - $($webEx.Message)"
                if ($webEx.Response) { $webEx.Response.Close() }
                return $null
            }
        }
    } catch {
        Log-Error "Excepcion en snapshot: $($_.Exception.Message)"
        return $null
    }
}

function Get-SnapshotBasic {
    param(
        [string]$Url,
        [string]$Username,
        [string]$Password,
        [int]$TimeoutSec = 8
    )

    try {
        $cred = New-Object System.Net.NetworkCredential($Username, $Password)
        $request = [System.Net.HttpWebRequest]::Create($Url)
        $request.Method = "GET"
        $request.Timeout = $TimeoutSec * 1000
        $request.Credentials = $cred
        $request.UserAgent = "CaptureAgent/1.0"

        $response = $request.GetResponse()
        $stream = $response.GetResponseStream()
        $ms = New-Object System.IO.MemoryStream
        $stream.CopyTo($ms)
        $response.Close()
        return $ms.ToArray()
    } catch {
        Log-Error "Excepcion en snapshot basic: $($_.Exception.Message)"
        return $null
    }
}

function Get-Snapshot {
    param([object]$CamConfig)

    $authType = if ($CamConfig.auth_type) { $CamConfig.auth_type } else { "digest" }

    if ($authType -eq "basic") {
        return Get-SnapshotBasic -Url $CamConfig.snapshot_url -Username $CamConfig.username -Password $CamConfig.password
    } else {
        return Get-SnapshotDigest -Url $CamConfig.snapshot_url -Username $CamConfig.username -Password $CamConfig.password
    }
}

# ---------------------------------------------------------------------------
# Envio de frame al backend
# ---------------------------------------------------------------------------
function Send-Frame {
    param(
        [byte[]]$FrameData,
        [int]$CamId,
        [double]$CurrentFps
    )

    $url = $script:Config.backend_url
    $hostname = [System.Net.Dns]::GetHostName()

    try {
        $request = [System.Net.HttpWebRequest]::Create($url)
        $request.Method = "POST"
        $request.ContentType = "image/jpeg"
        $request.ContentLength = $FrameData.Length
        $request.Timeout = 10000
        $request.Headers.Add("X-Site-Id", $script:Config.site_id)
        $request.Headers.Add("X-Cam-Id", $CamId.ToString())
        $request.Headers.Add("X-Agent-Token", $script:Config.agent_token)
        $request.Headers.Add("X-Agent-Host", $hostname)
        $request.Headers.Add("X-Agent-Fps", $CurrentFps.ToString("F1"))
        $request.UserAgent = "CaptureAgent/1.0"

        # Aceptar certificados auto-firmados en desarrollo
        # En produccion usar certificado valido
        [System.Net.ServicePointManager]::ServerCertificateValidationCallback = { $true }

        $reqStream = $request.GetRequestStream()
        $reqStream.Write($FrameData, 0, $FrameData.Length)
        $reqStream.Close()

        $response = $request.GetResponse()
        $status = [int]$response.StatusCode
        $response.Close()

        Log-Debug "Frame enviado: cam=$CamId bytes=$($FrameData.Length) status=$status"
        return $true
    } catch {
        Log-Error "Error enviando frame cam=$CamId : $($_.Exception.Message)"
        return $false
    }
}

# ---------------------------------------------------------------------------
# Polling HTTP para recibir comandos del servidor
# ---------------------------------------------------------------------------
$script:PollUrl = $null
$script:LastPollTime = [DateTime]::MinValue
$script:PollIntervalSec = 1  # Cada 1 segundo

function Initialize-PollUrl {
    # Construir URL de polling a partir de backend_url
    # backend_url = https://accesoswhatsapp.info/api/camera-frames
    # poll_url    = https://accesoswhatsapp.info/api/camera-frames/poll?site_id=XX
    $baseUrl = $script:Config.backend_url -replace '/+$', ''
    $script:PollUrl = "$baseUrl/poll?site_id=$($script:Config.site_id)"
    Log-Info "Poll URL: $($script:PollUrl)"
}

function Get-PendingCommand {
    # Solo hacer poll cada N segundos
    if (((Get-Date) - $script:LastPollTime).TotalSeconds -lt $script:PollIntervalSec) {
        return $null
    }
    $script:LastPollTime = Get-Date

    try {
        $request = [System.Net.HttpWebRequest]::Create($script:PollUrl)
        $request.Method = "GET"
        $request.Timeout = 5000
        $request.Headers.Add("X-Agent-Token", $script:Config.agent_token)
        $request.UserAgent = "CaptureAgent/1.0"

        $response = $request.GetResponse()
        $reader = New-Object System.IO.StreamReader($response.GetResponseStream())
        $body = $reader.ReadToEnd()
        $response.Close()

        $result = $body | ConvertFrom-Json

        if ($result.commands -and $result.commands.Count -gt 0) {
            Log-Info "Poll: $($result.commands.Count) comando(s) recibido(s)"
            # Retornar el primer comando; los demas se procesan en la siguiente iteracion
            # Encolarlos todos procesando uno por uno
            foreach ($cmd in $result.commands) {
                Log-Info "  Comando: $($cmd.cmd)"
            }
            return $result.commands[0]
        }
    } catch {
        # Solo loguear errores cada 30 segundos para no llenar el log
        if (((Get-Date) - $script:LastPollTime).TotalSeconds -lt 1) {
            Log-Debug "Poll error: $($_.Exception.Message)"
        }
    }
    return $null
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
                # Modo "all": transmitir todos los canales descubiertos del DVR
                Log-Info "start_stream mode=all: iniciando $($script:DiscoveredCameras.Count) canales descubiertos"
                foreach ($cam in $script:DiscoveredCameras) {
                    Start-CameraStream -CamId $cam.channel -Fps $fps -DurationSec $duration
                }
            } elseif ($camId -gt 0) {
                Start-CameraStream -CamId $camId -Fps $fps -DurationSec $duration
            } else {
                # Modo normal: solo camaras configuradas
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
                # Detener todas las camaras activas
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

# ---------------------------------------------------------------------------
# Control de streaming
# ---------------------------------------------------------------------------
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
        # Sin timeout = streaming continuo
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

# ---------------------------------------------------------------------------
# Ciclo principal de captura - PARALELO usando runspaces
# ---------------------------------------------------------------------------

# Script block que se ejecuta en cada runspace (captura + envio de una camara)
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

        # --- Capturar snapshot usando Invoke-WebRequest (maneja Digest auth) ---
        $frameData = $null
        $secPass = ConvertTo-SecureString $Password -AsPlainText -Force
        $psCred = New-Object System.Management.Automation.PSCredential($Username, $secPass)

        $snapResponse = Invoke-WebRequest -Uri $SnapshotUrl -Credential $psCred -TimeoutSec 4 -UseBasicParsing
        if ($snapResponse.StatusCode -eq 200 -and $snapResponse.Content.Length -gt 100) {
            $frameData = $snapResponse.Content
        } else {
            return @{ ok = $false; camId = $CamId; error = "Frame vacio o status $($snapResponse.StatusCode)" }
        }

        # --- Enviar al backend ---
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

function Initialize-RunspacePool {
    $maxThreads = [Math]::Max($script:Config.cameras.Count, 4)
    $script:RunspacePool = [runspacefactory]::CreateRunspacePool(1, $maxThreads)
    $script:RunspacePool.Open()
    Log-Info "RunspacePool inicializado: max=$maxThreads threads"
}

function Invoke-CaptureLoop {
    # Construir mapa de configs: primero las del config.json, luego las descubiertas
    $camConfigs = @{}
    foreach ($cam in $script:Config.cameras) {
        $camConfigs[$cam.cam_id] = $cam
    }
    # Agregar canales descubiertos que no estan en config
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

    # Verificar timeouts primero
    foreach ($camId in @($script:StreamingCams.Keys)) {
        if ($script:StreamTimeout.ContainsKey($camId)) {
            if ((Get-Date) -gt $script:StreamTimeout[$camId]) {
                Log-Info "Timeout alcanzado para cam=$camId"
                Stop-CameraStream -CamId $camId
            }
        }
    }

    if ($script:StreamingCams.Count -eq 0) { return }

    # Lanzar captura paralela de todas las camaras activas
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

    # Esperar a que todos terminen (con timeout de 6s)
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

# ---------------------------------------------------------------------------
# Heartbeat
# ---------------------------------------------------------------------------
$script:LastHeartbeat = [DateTime]::MinValue

function Send-Heartbeat {
    $interval = $script:Config.defaults.heartbeat_interval_sec
    if (((Get-Date) - $script:LastHeartbeat).TotalSeconds -lt $interval) { return }

    $script:LastHeartbeat = Get-Date
    $hostname = [System.Net.Dns]::GetHostName()

    $heartbeat = @{
        agent = "capture-agent"
        state = $script:AgentState
        site_id = $script:Config.site_id
        host = $hostname
        cameras = $script:Config.cameras.Count
        streaming = $script:StreamingCams.Count
        ts = (Get-Date).ToString("yyyy-MM-ddTHH:mm:sszzz")
    } | ConvertTo-Json -Compress

    Log-Debug "Heartbeat: $heartbeat"
    # El heartbeat se enviaria por MQTT. En fase 1, solo se registra en log.
    # Fase 2: publicar a site/{site_id}/agent/heartbeat
}

# ---------------------------------------------------------------------------
# Loop principal
# ---------------------------------------------------------------------------
function Start-AgentLoop {
    Log-Info "Iniciando loop principal..."

    while (-not $script:StopRequested) {
        try {
            # 1. Verificar comandos pendientes
            $cmd = Get-PendingCommand
            if ($cmd) {
                Process-Command -Cmd $cmd
            }

            # 2. Si hay camaras activas, capturar y enviar (paralelo)
            if ($script:StreamingCams.Count -gt 0) {
                Invoke-CaptureLoop
                # Minimo delay entre ciclos - las camaras se capturan en paralelo
                # El tiempo real del ciclo lo domina la camara mas lenta
                Start-Sleep -Milliseconds 40
            } else {
                # Estado idle - polling cada 1s para comandos
                Start-Sleep -Milliseconds 1000
            }

            # 3. Heartbeat
            Send-Heartbeat

        } catch {
            Log-Error "Error en loop principal: $($_.Exception.Message)"
            Start-Sleep -Seconds 5
        }
    }

    Log-Info "=== Agente detenido ==="
}

# ---------------------------------------------------------------------------
# Punto de entrada
# ---------------------------------------------------------------------------

# Manejar Ctrl+C
$null = Register-EngineEvent -SourceIdentifier PowerShell.Exiting -Action {
    $script:StopRequested = $true
}

try {
    [Console]::TreatControlCAsInput = $false
} catch {}

# Permitir TLS 1.2 (necesario para HTTPS a servidores modernos)
try {
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12
} catch {}

Initialize-Agent
Start-AgentLoop
