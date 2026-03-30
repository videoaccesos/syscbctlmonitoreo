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

    $script:AgentState = "idle"
    Log-Info "Agente en estado IDLE"
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
# Manejo de comandos MQTT (polling via archivo de comandos)
# ---------------------------------------------------------------------------
# NOTA: PowerShell 5.1 no tiene cliente MQTT nativo.
# Fase 1: Usamos un archivo de comandos como mecanismo simple.
# El archivo cmd.json es escrito por un script auxiliar que escucha MQTT
# (mosquitto_sub) o por el backend directamente.
# Fase 2: Migrar a cliente MQTT nativo con M2Mqtt.dll
#
# Alternativa incluida: polling HTTP al backend para obtener comandos.
# ---------------------------------------------------------------------------

$script:CmdFile = Join-Path $PSScriptRoot "cmd.json"

function Get-PendingCommand {
    # Opcion 1: Archivo de comandos local
    if (Test-Path $script:CmdFile) {
        try {
            $cmdJson = Get-Content $script:CmdFile -Raw | ConvertFrom-Json
            Remove-Item $script:CmdFile -Force -ErrorAction SilentlyContinue
            Log-Info "Comando recibido de archivo: $($cmdJson.cmd)"
            return $cmdJson
        } catch {
            Log-Warn "Error leyendo cmd.json: $($_.Exception.Message)"
            Remove-Item $script:CmdFile -Force -ErrorAction SilentlyContinue
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

            if ($camId -gt 0) {
                Start-CameraStream -CamId $camId -Fps $fps -DurationSec $duration
            } else {
                # Todas las camaras
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
                foreach ($cam in $script:Config.cameras) {
                    Stop-CameraStream -CamId $cam.cam_id
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
    $script:StreamTimeout[$CamId] = (Get-Date).AddSeconds($DurationSec)
    $script:AgentState = "streaming"

    Log-Info "STREAM START: cam=$CamId fps=$Fps duration=${DurationSec}s"
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
# Ciclo principal de captura
# ---------------------------------------------------------------------------
function Invoke-CaptureLoop {
    $camConfigs = @{}
    foreach ($cam in $script:Config.cameras) {
        $camConfigs[$cam.cam_id] = $cam
    }

    foreach ($camId in @($script:StreamingCams.Keys)) {
        # Verificar timeout
        if ($script:StreamTimeout.ContainsKey($camId)) {
            if ((Get-Date) -gt $script:StreamTimeout[$camId]) {
                Log-Info "Timeout alcanzado para cam=$camId"
                Stop-CameraStream -CamId $camId
                continue
            }
        }

        $streamInfo = $script:StreamingCams[$camId]
        if (-not $streamInfo) { continue }

        $camConfig = $camConfigs[$camId]
        if (-not $camConfig) {
            Log-Warn "Camara $camId no encontrada en config"
            continue
        }

        # Capturar snapshot
        $frameData = Get-Snapshot -CamConfig $camConfig

        if ($frameData -and $frameData.Length -gt 100) {
            # Enviar al backend
            $sent = Send-Frame -FrameData $frameData -CamId $camId -CurrentFps $streamInfo.fps
            if ($sent) {
                $streamInfo.frameCount++
            } else {
                $streamInfo.errorCount++
            }
        } else {
            $streamInfo.errorCount++
            if ($streamInfo.errorCount % 10 -eq 0) {
                Log-Warn "cam=$camId acumula $($streamInfo.errorCount) errores de captura"
            }
        }
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

            # 2. Si hay camaras activas, capturar y enviar
            if ($script:StreamingCams.Count -gt 0) {
                Invoke-CaptureLoop

                # Calcular delay basado en FPS mas alto entre las camaras activas
                $maxFps = ($script:StreamingCams.Values | ForEach-Object { $_.fps } | Measure-Object -Maximum).Maximum
                if ($maxFps -le 0) { $maxFps = 1 }
                $delayMs = [int](1000 / $maxFps)
                Start-Sleep -Milliseconds $delayMs
            } else {
                # Estado idle - polling lento para comandos
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
