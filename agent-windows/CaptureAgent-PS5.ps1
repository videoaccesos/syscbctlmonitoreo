<#
.SYNOPSIS
    Agente de captura de frames - archivo unico, autoinstalable.

.DESCRIPTION
    Proceso residente en Windows que:
    - Si no existe config.json, ejecuta un wizard interactivo
    - Si no esta registrado como Tarea Programada, se autoinstala
    - Se conecta al broker MQTT y espera comandos start_stream / stop_stream
    - Captura snapshots JPEG desde DVR/camaras locales por LAN (paralelo)
    - Envia los frames al backend central por HTTPS POST

    Comunicacion: MQTT para comandos y estado, HTTP POST para frames.
    Solo conexiones salientes. Funciona detras de NAT/CGNAT.

.NOTES
    Version compatible con PowerShell 2.0+ (Windows 7/8/10/11 built-in).
    Requiere: acceso LAN al DVR, acceso a internet
    Ejecutar como Administrador para autoinstalacion de tarea programada.
    Uso: powershell -ExecutionPolicy Bypass -File .\CaptureAgent-PS5.ps1
#>

param(
    [string]$ConfigPath,
    [switch]$Uninstall,
    [switch]$RunAsService
)

# Fallback para $PSScriptRoot (no existe en PS 2.0)
if (-not $PSScriptRoot) {
    $PSScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Definition
}
if (-not $ConfigPath) {
    $ConfigPath = Join-Path $PSScriptRoot "config.json"
}

# Verificar version minima de PowerShell
$psVer = $PSVersionTable.PSVersion.Major
if ($psVer -lt 3) {
    Write-Host ""
    Write-Host "ERROR: Se requiere PowerShell 3.0 o superior." -ForegroundColor Red
    Write-Host "  Version actual: $($PSVersionTable.PSVersion)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Para actualizar PowerShell:" -ForegroundColor Yellow
    Write-Host "  Windows 7/8:  Instalar WMF 5.1 desde:" -ForegroundColor Yellow
    Write-Host "  https://www.microsoft.com/en-us/download/details.aspx?id=54616" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  Windows 10/11: Ya incluye PS 5.1 (abra como Administrador)" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Presione Enter para salir"
    exit 1
}

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
    exit 0
}

# ============================================================================
# SETUP WIZARD
# ============================================================================
function Run-SetupWizard {
    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host "  VideoAccesos - Configuracion del Agente " -ForegroundColor Cyan
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host ""

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

    try {
        $devInfo = Invoke-WebRequest -Uri "http://${dvrIp}/ISAPI/System/deviceInfo" -Credential $cred -TimeoutSec 5 -UseBasicParsing
        if ($devInfo.Content -match "<deviceName>(.*?)</deviceName>") { Write-Host "  Dispositivo: $($Matches[1])" -ForegroundColor Green }
        if ($devInfo.Content -match "<model>(.*?)</model>") { Write-Host "  Modelo:      $($Matches[1])" -ForegroundColor Green }
    } catch {
        Write-Host "  No se pudo obtener info del dispositivo" -ForegroundColor Yellow
    }

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
        Write-Host "ERROR: No se encontraron canales con imagen." -ForegroundColor Red
        exit 1
    }

    Write-Host ""
    Write-Host "$($cameras.Count) canales con imagen encontrados." -ForegroundColor Green

    $config = @{
        site_id = $siteId
        agent_token = $agentToken
        backend_url = $backendUrl
        mqtt = @{
            broker = "50.62.182.131"
            port = 1883
            username = "admin"
            password = "v1de0acces0s"
        }
        cameras = $cameras
        defaults = @{
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
        $taskUser = ($existing.Principal.UserId)
        if ($taskUser -eq "SYSTEM" -or $taskUser -eq "NT AUTHORITY\SYSTEM") {
            Write-Host "Actualizando tarea de SYSTEM a usuario actual..." -ForegroundColor Cyan
            Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
        } else {
            return $true
        }
    }

    $isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
        [Security.Principal.WindowsBuiltInRole]::Administrator
    )
    if (-not $isAdmin) {
        Write-Host "AVISO: Para instalar la tarea, ejecute como Administrador." -ForegroundColor Yellow
        return $false
    }

    Write-Host "Instalando como tarea programada..." -ForegroundColor Cyan
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

    $triggerStartup = New-ScheduledTaskTrigger -AtStartup
    $triggerRepeat  = New-ScheduledTaskTrigger -Once -At (Get-Date) `
        -RepetitionInterval (New-TimeSpan -Minutes 3) `
        -RepetitionDuration (New-TimeSpan -Days 9999)

    $action = New-ScheduledTaskAction `
        -Execute "powershell.exe" `
        -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$scriptPath`" -RunAsService" `
        -WorkingDirectory $PSScriptRoot

    $currentUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name

    Register-ScheduledTask `
        -TaskName $TaskName `
        -Action $action `
        -Trigger @($triggerStartup, $triggerRepeat) `
        -Settings $settings `
        -User $currentUser `
        -RunLevel Highest `
        -Description "VideoAccesos: Agente de captura MQTT + HTTP. Se relanza cada 3 min si se detiene."

    Write-Host "Tarea '$TaskName' registrada OK." -ForegroundColor Green
    Write-Host "  Detener:     Stop-ScheduledTask '$TaskName'" -ForegroundColor Gray
    Write-Host "  Desinstalar: .\CaptureAgent.ps1 -Uninstall" -ForegroundColor Gray
    Write-Host ""
    return $true
}

# ============================================================================
# ESTADO GLOBAL
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
# CLIENTE MQTT 3.1.1 (implementacion pura en PowerShell/.NET)
# Usa MemoryStream/BinaryWriter para construir paquetes binarios
# y evitar problemas de pipeline unrolling con byte arrays.
# ============================================================================
$script:MqttClient = $null      # TcpClient
$script:MqttStream = $null      # NetworkStream
$script:MqttConnected = $false
$script:MqttPacketId = 0
$script:MqttLastPing = [DateTime]::MinValue
$script:MqttLastMessage = [DateTime]::MinValue
$script:MqttKeepalive = 30      # segundos

function Get-MqttPacketId {
    $script:MqttPacketId++
    if ($script:MqttPacketId -gt 65535) { $script:MqttPacketId = 1 }
    return $script:MqttPacketId
}

# Escribir "remaining length" MQTT al BinaryWriter
function Write-MqttRemainingLength {
    param([System.IO.BinaryWriter]$Writer, [int]$Length)
    do {
        $b = $Length % 128
        $Length = [math]::Floor($Length / 128)
        if ($Length -gt 0) { $b = $b -bor 0x80 }
        $Writer.Write([byte]$b)
    } while ($Length -gt 0)
}

# Escribir string MQTT (2-byte length prefix + UTF-8) al BinaryWriter
function Write-MqttString {
    param([System.IO.BinaryWriter]$Writer, [string]$Str)
    $strBytes = [System.Text.Encoding]::UTF8.GetBytes($Str)
    $Writer.Write([byte]([math]::Floor($strBytes.Length / 256) -band 0xFF))
    $Writer.Write([byte]($strBytes.Length -band 0xFF))
    if ($strBytes.Length -gt 0) { $Writer.Write($strBytes) }
}

function Connect-MqttBroker {
    $broker = $script:Config.mqtt.broker
    $port = $script:Config.mqtt.port
    $mqttUser = $script:Config.mqtt.username
    $mqttPass = $script:Config.mqtt.password
    $clientId = "agent-$($script:Config.site_id)-$([System.Net.Dns]::GetHostName())"
    $siteId = $script:Config.site_id

    Log-Info "MQTT: Conectando a ${broker}:${port} como $clientId"

    try {
        Disconnect-MqttBroker

        $script:MqttClient = New-Object System.Net.Sockets.TcpClient
        $script:MqttClient.ReceiveTimeout = 1000
        $script:MqttClient.SendTimeout = 5000
        $script:MqttClient.Connect($broker, $port)
        $script:MqttStream = $script:MqttClient.GetStream()

        # --- Construir variable header + payload en MemoryStream ---
        $willTopic = "videoaccesos/${siteId}/status"
        $willMessage = '{"state":"offline","site_id":"' + $siteId + '"}'

        $bodyMs = New-Object System.IO.MemoryStream
        $bodyW = New-Object System.IO.BinaryWriter($bodyMs)

        # Variable header: Protocol Name + Level + Flags + Keepalive
        Write-MqttString $bodyW "MQTT"
        $bodyW.Write([byte]0x04)  # Protocol Level 3.1.1
        # Flags: clean=1(0x02), will=1(0x04), willQoS=0, username=1(0x40+0x80 for pass)
        $bodyW.Write([byte](0x02 -bor 0x04 -bor 0x40 -bor 0x80))
        $bodyW.Write([byte]([math]::Floor($script:MqttKeepalive / 256) -band 0xFF))
        $bodyW.Write([byte]($script:MqttKeepalive -band 0xFF))

        # Payload: ClientID, Will Topic, Will Message, Username, Password
        Write-MqttString $bodyW $clientId
        Write-MqttString $bodyW $willTopic
        Write-MqttString $bodyW $willMessage
        Write-MqttString $bodyW $mqttUser
        Write-MqttString $bodyW $mqttPass

        $bodyW.Flush()
        $bodyBytes = $bodyMs.ToArray()
        $bodyW.Dispose()
        $bodyMs.Dispose()

        # --- Construir paquete completo: fixed header + body ---
        $pktMs = New-Object System.IO.MemoryStream
        $pktW = New-Object System.IO.BinaryWriter($pktMs)
        $pktW.Write([byte]0x10)  # CONNECT
        Write-MqttRemainingLength $pktW $bodyBytes.Length
        $pktW.Write($bodyBytes)
        $pktW.Flush()

        $packetBytes = $pktMs.ToArray()
        $pktW.Dispose()
        $pktMs.Dispose()

        $script:MqttStream.Write($packetBytes, 0, $packetBytes.Length)
        $script:MqttStream.Flush()

        # Esperar CONNACK
        Start-Sleep -Milliseconds 500
        $connack = New-Object byte[] 4
        $bytesRead = $script:MqttStream.Read($connack, 0, 4)

        if ($bytesRead -ge 4 -and $connack[0] -eq 0x20 -and $connack[3] -eq 0x00) {
            $script:MqttConnected = $true
            $script:MqttLastPing = Get-Date
            $script:MqttLastMessage = Get-Date
            Log-Info "MQTT: Conectado OK"

            Subscribe-MqttTopic "videoaccesos/${siteId}/cmd"
            return $true
        } else {
            $rc = if ($bytesRead -ge 4) { $connack[3] } else { -1 }
            Log-Error "MQTT: CONNACK fallo (rc=$rc bytesRead=$bytesRead)"
            Disconnect-MqttBroker
            return $false
        }
    } catch {
        Log-Error "MQTT: Error de conexion: $($_.Exception.Message)"
        Disconnect-MqttBroker
        return $false
    }
}

function Disconnect-MqttBroker {
    $script:MqttConnected = $false
    if ($script:MqttStream) {
        try {
            # Enviar DISCONNECT
            $script:MqttStream.Write([byte[]]@(0xE0, 0x00), 0, 2)
            $script:MqttStream.Flush()
        } catch {}
        try { $script:MqttStream.Close() } catch {}
        $script:MqttStream = $null
    }
    if ($script:MqttClient) {
        try { $script:MqttClient.Close() } catch {}
        $script:MqttClient = $null
    }
}

function Subscribe-MqttTopic {
    param([string]$Topic)
    if (-not $script:MqttConnected) { return }

    $packetId = Get-MqttPacketId

    # Construir body: packetId + topic + qos
    $bodyMs = New-Object System.IO.MemoryStream
    $bodyW = New-Object System.IO.BinaryWriter($bodyMs)
    $bodyW.Write([byte]([math]::Floor($packetId / 256) -band 0xFF))
    $bodyW.Write([byte]($packetId -band 0xFF))
    Write-MqttString $bodyW $Topic
    $bodyW.Write([byte]0x00)  # QoS 0
    $bodyW.Flush()
    $bodyBytes = $bodyMs.ToArray()
    $bodyW.Dispose(); $bodyMs.Dispose()

    # Paquete completo
    $pktMs = New-Object System.IO.MemoryStream
    $pktW = New-Object System.IO.BinaryWriter($pktMs)
    $pktW.Write([byte]0x82)  # SUBSCRIBE
    Write-MqttRemainingLength $pktW $bodyBytes.Length
    $pktW.Write($bodyBytes)
    $pktW.Flush()
    $packetBytes = $pktMs.ToArray()
    $pktW.Dispose(); $pktMs.Dispose()

    $script:MqttStream.Write($packetBytes, 0, $packetBytes.Length)
    $script:MqttStream.Flush()

    Log-Info "MQTT: Suscrito a $Topic"
}

function Publish-MqttMessage {
    param([string]$Topic, [byte[]]$Payload)
    if (-not $script:MqttConnected) { return }

    try {
        # Construir body: topic + payload
        $bodyMs = New-Object System.IO.MemoryStream
        $bodyW = New-Object System.IO.BinaryWriter($bodyMs)
        Write-MqttString $bodyW $Topic
        if ($Payload.Length -gt 0) { $bodyW.Write($Payload) }
        $bodyW.Flush()
        $bodyBytes = $bodyMs.ToArray()
        $bodyW.Dispose(); $bodyMs.Dispose()

        # Paquete completo
        $pktMs = New-Object System.IO.MemoryStream
        $pktW = New-Object System.IO.BinaryWriter($pktMs)
        $pktW.Write([byte]0x30)  # PUBLISH QoS 0
        Write-MqttRemainingLength $pktW $bodyBytes.Length
        $pktW.Write($bodyBytes)
        $pktW.Flush()
        $packetBytes = $pktMs.ToArray()
        $pktW.Dispose(); $pktMs.Dispose()

        $script:MqttStream.Write($packetBytes, 0, $packetBytes.Length)
        $script:MqttStream.Flush()
    } catch {
        Log-Warn "MQTT: Error publicando a $Topic : $($_.Exception.Message)"
        $script:MqttConnected = $false
    }
}

function Publish-MqttJson {
    param([string]$Topic, [object]$Data)
    $json = $Data | ConvertTo-Json -Depth 4 -Compress
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
    Publish-MqttMessage -Topic $Topic -Payload $bytes
}

function Send-MqttPing {
    if (-not $script:MqttConnected) { return }
    if (((Get-Date) - $script:MqttLastPing).TotalSeconds -lt ($script:MqttKeepalive / 2)) { return }

    try {
        $script:MqttStream.Write([byte[]]@(0xC0, 0x00), 0, 2)
        $script:MqttStream.Flush()
        $script:MqttLastPing = Get-Date
        Log-Debug "MQTT: PINGREQ enviado"
    } catch {
        Log-Warn "MQTT: Error en PINGREQ: $($_.Exception.Message)"
        $script:MqttConnected = $false
    }
}

# Leer mensajes MQTT disponibles (no bloqueante)
function Read-MqttMessages {
    if (-not $script:MqttConnected -or -not $script:MqttStream) { return }

    try {
        while ($script:MqttClient.Available -gt 0) {
            $firstByte = $script:MqttStream.ReadByte()
            if ($firstByte -lt 0) { $script:MqttConnected = $false; return }

            $packetType = [math]::Floor($firstByte / 16) -band 0x0F

            # Decodificar remaining length
            $multiplier = 1
            $remainingLength = 0
            do {
                $encodedByte = $script:MqttStream.ReadByte()
                if ($encodedByte -lt 0) { $script:MqttConnected = $false; return }
                $remainingLength += ($encodedByte -band 0x7F) * $multiplier
                $multiplier *= 128
            } while (($encodedByte -band 0x80) -ne 0)

            # Leer el resto del paquete
            $packetData = $null
            if ($remainingLength -gt 0) {
                $packetData = New-Object byte[] $remainingLength
                $offset = 0
                while ($offset -lt $remainingLength) {
                    $read = $script:MqttStream.Read($packetData, $offset, $remainingLength - $offset)
                    if ($read -le 0) { $script:MqttConnected = $false; return }
                    $offset += $read
                }
            }

            $script:MqttLastMessage = Get-Date

            switch ($packetType) {
                3 {  # PUBLISH
                    if ($packetData -and $packetData.Length -ge 2) {
                        $topicLen = ($packetData[0] * 256) + $packetData[1]
                        if ($packetData.Length -ge (2 + $topicLen)) {
                            $topic = [System.Text.Encoding]::UTF8.GetString($packetData, 2, $topicLen)
                            $payloadOffset = 2 + $topicLen
                            $payloadLen = $packetData.Length - $payloadOffset
                            $payloadStr = ""
                            if ($payloadLen -gt 0) {
                                $payloadStr = [System.Text.Encoding]::UTF8.GetString($packetData, $payloadOffset, $payloadLen)
                            }
                            Log-Info "MQTT: Mensaje recibido en $topic"
                            Handle-MqttCommand $topic $payloadStr
                        }
                    }
                }
                9 {  # SUBACK
                    Log-Debug "MQTT: SUBACK recibido"
                }
                13 { # PINGRESP
                    Log-Debug "MQTT: PINGRESP recibido"
                }
                default {
                    Log-Debug "MQTT: Paquete tipo $packetType ignorado"
                }
            }
        }
    } catch [System.IO.IOException] {
        # Timeout de lectura - normal, no hay datos
    } catch {
        Log-Warn "MQTT: Error leyendo: $($_.Exception.Message)"
        $script:MqttConnected = $false
    }
}

function Handle-MqttCommand {
    param([string]$Topic, [string]$PayloadStr)
    try {
        $cmd = $PayloadStr | ConvertFrom-Json
        Log-Info "MQTT CMD: $($cmd.cmd) $(if ($cmd.cam_id) { "cam=$($cmd.cam_id)" } else { '' })"
        Process-Command -Cmd $cmd
    } catch {
        Log-Error "MQTT: Error procesando comando: $($_.Exception.Message)"
    }
}

# ============================================================================
# EXPLORACION DEL DVR
# ============================================================================
function Explore-DVR {
    $baseCam = $script:Config.cameras[0]
    if (-not $baseCam) {
        Log-Warn "No hay camaras configuradas, no se puede explorar DVR"
        return
    }

    $dvrIp = $null
    if ($baseCam.snapshot_url -match "http://([^/]+)") { $dvrIp = $Matches[1] }
    if (-not $dvrIp) { Log-Warn "No se pudo extraer IP del DVR"; return }

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
                Log-Info "  Canal $ch ($name): OK [${sizeKb} KB]"
                $discovered += @{
                    channel = $ch; code = $chCode; alias = $name
                    snapshot_url = $url; username = $username; password = $password
                    auth_type = "digest"; bytes = $r.Content.Length
                }
            }
        } catch {}
    }

    $script:DiscoveredCameras = $discovered
    Log-Info "DVR explorado: $($discovered.Count) canales con imagen"

    # Reportar canales via MQTT
    Report-Channels
}

function Report-Channels {
    if ($script:DiscoveredCameras.Count -eq 0) { return }

    $channels = @()
    foreach ($cam in $script:DiscoveredCameras) {
        $channels += @{ channel = $cam.channel; code = $cam.code; alias = $cam.alias; bytes = $cam.bytes }
    }

    $data = @{ site_id = $script:Config.site_id; channels = $channels }

    # Via MQTT (principal)
    if ($script:MqttConnected) {
        $siteId = $script:Config.site_id
        Publish-MqttJson -Topic "videoaccesos/${siteId}/channels" -Data $data
        Log-Info "Canales reportados via MQTT"
    }

    # Via HTTP (fallback)
    try {
        $baseUrl = $script:Config.backend_url -replace '/+$', ''
        $reportUrl = "$baseUrl/channels"
        $body = $data | ConvertTo-Json -Depth 3

        $request = [System.Net.HttpWebRequest]::Create($reportUrl)
        $request.Method = "POST"
        $request.ContentType = "application/json"
        $request.Timeout = 10000
        $request.Headers.Add("X-Agent-Token", $script:Config.agent_token)
        $request.UserAgent = "CaptureAgent/2.0"

        $bytes = [System.Text.Encoding]::UTF8.GetBytes($body)
        $request.ContentLength = $bytes.Length
        $reqStream = $request.GetRequestStream()
        $reqStream.Write($bytes, 0, $bytes.Length)
        $reqStream.Close()

        $response = $request.GetResponse()
        $response.Close()
        Log-Info "Canales reportados via HTTP"
    } catch {
        Log-Debug "Error reportando canales via HTTP: $($_.Exception.Message)"
    }
}

# ============================================================================
# CONTROL DE STREAMING
# ============================================================================
function Process-Command {
    param([object]$Cmd)

    switch ($Cmd.cmd) {
        "start_stream" {
            $fps = if ($Cmd.fps) { [double]$Cmd.fps } else { $script:Config.defaults.fps }
            $duration = if ($Cmd.duration) { [int]$Cmd.duration } else { $script:Config.defaults.max_duration_sec }
            $camId = if ($Cmd.cam_id) { [int]$Cmd.cam_id } else { 0 }
            $mode = if ($Cmd.mode) { $Cmd.mode } else { "all" }

            if (($mode -eq "all" -or $camId -eq 0) -and $script:DiscoveredCameras.Count -gt 0) {
                Log-Info "start_stream: iniciando $($script:DiscoveredCameras.Count) canales"
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

function Start-CameraStream {
    param([int]$CamId, [double]$Fps, [int]$DurationSec)
    $script:StreamingCams[$CamId] = @{ fps = $Fps; started = Get-Date; frameCount = 0; errorCount = 0 }
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
# CAPTURA PARALELA con RunspacePool (envio de frames via HTTP POST)
# ============================================================================
$script:CaptureScriptBlock = {
    param(
        [string]$SnapshotUrl, [string]$Username, [string]$Password,
        [string]$BackendUrl, [string]$SiteId, [int]$CamId,
        [string]$AgentToken, [double]$Fps
    )
    try {
        [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12
        [System.Net.ServicePointManager]::ServerCertificateValidationCallback = { $true }

        $secPass = ConvertTo-SecureString $Password -AsPlainText -Force
        $psCred = New-Object System.Management.Automation.PSCredential($Username, $secPass)

        $snapResponse = Invoke-WebRequest -Uri $SnapshotUrl -Credential $psCred -TimeoutSec 4 -UseBasicParsing
        if ($snapResponse.StatusCode -eq 200 -and $snapResponse.Content.Length -gt 100) {
            $frameData = $snapResponse.Content
        } else {
            return @{ ok = $false; camId = $CamId; error = "Frame vacio" }
        }

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
        $request.UserAgent = "CaptureAgent/2.0"

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
$script:PoolRecycleEvery = 500

function Initialize-RunspacePool {
    if ($script:RunspacePool) {
        try { $script:RunspacePool.Close() } catch {}
        try { $script:RunspacePool.Dispose() } catch {}
    }
    $maxThreads = [Math]::Min([Math]::Max($script:Config.cameras.Count, 4), 16)
    $script:RunspacePool = [runspacefactory]::CreateRunspacePool(1, $maxThreads)
    $script:RunspacePool.Open()
    $script:CaptureCount = 0
    Log-Info "RunspacePool: max=$maxThreads threads"
}

function Invoke-CaptureLoop {
    $script:CaptureCount++
    if ($script:CaptureCount -ge $script:PoolRecycleEvery) {
        Log-Info "Reciclando RunspacePool..."
        Initialize-RunspacePool
        [System.GC]::Collect()
    }

    # Mapa de configs: config.json + descubiertas
    $camConfigs = @{}
    foreach ($cam in $script:Config.cameras) { $camConfigs[$cam.cam_id] = $cam }
    foreach ($cam in $script:DiscoveredCameras) {
        if (-not $camConfigs.ContainsKey($cam.channel)) {
            $camConfigs[$cam.channel] = @{
                cam_id = $cam.channel; alias = $cam.alias; snapshot_url = $cam.snapshot_url
                username = $cam.username; password = $cam.password
            }
        }
    }

    # Verificar timeouts
    foreach ($camId in @($script:StreamingCams.Keys)) {
        if ($script:StreamTimeout.ContainsKey($camId) -and (Get-Date) -gt $script:StreamTimeout[$camId]) {
            Log-Info "Timeout cam=$camId"
            Stop-CameraStream -CamId $camId
        }
    }
    if ($script:StreamingCams.Count -eq 0) { return }

    # Lanzar captura paralela
    $jobs = @()
    foreach ($camId in @($script:StreamingCams.Keys)) {
        $streamInfo = $script:StreamingCams[$camId]
        $camConfig = $camConfigs[$camId]
        if (-not $streamInfo -or -not $camConfig) { continue }

        $ps = [powershell]::Create()
        $ps.RunspacePool = $script:RunspacePool
        $ps.AddScript($script:CaptureScriptBlock).AddParameters(@{
            SnapshotUrl = $camConfig.snapshot_url
            Username    = $camConfig.username
            Password    = $camConfig.password
            BackendUrl  = $script:Config.backend_url
            SiteId      = $script:Config.site_id
            CamId       = $camId
            AgentToken  = $script:Config.agent_token
            Fps         = $streamInfo.fps
        }) | Out-Null

        $handle = $ps.BeginInvoke()
        $jobs += @{ ps = $ps; handle = $handle; camId = $camId }
    }

    # Esperar resultados (timeout 6s)
    $deadline = (Get-Date).AddSeconds(6)
    foreach ($job in $jobs) {
        $remaining = ($deadline - (Get-Date)).TotalMilliseconds
        if ($remaining -gt 0) { $job.handle.AsyncWaitHandle.WaitOne([int]$remaining) | Out-Null }

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
            Log-Warn "cam=$($job.camId) timeout en captura"
        }
        $job.ps.Dispose()
    }
}

# ============================================================================
# HEARTBEAT (via MQTT)
# ============================================================================
$script:LastHeartbeat = [DateTime]::MinValue

function Send-Heartbeat {
    $interval = $script:Config.defaults.heartbeat_interval_sec
    if (((Get-Date) - $script:LastHeartbeat).TotalSeconds -lt $interval) { return }
    $script:LastHeartbeat = Get-Date

    $proc = [System.Diagnostics.Process]::GetCurrentProcess()
    $memMB = [Math]::Round($proc.WorkingSet64 / 1MB, 1)

    $heartbeat = @{
        state = $script:AgentState
        site_id = $script:Config.site_id
        host = [System.Net.Dns]::GetHostName()
        cameras = $script:DiscoveredCameras.Count
        streaming = $script:StreamingCams.Count
        memory_mb = $memMB
        mqtt = $script:MqttConnected
        ts = (Get-Date).ToString("yyyy-MM-ddTHH:mm:sszzz")
    }

    if ($script:MqttConnected) {
        $siteId = $script:Config.site_id
        Publish-MqttJson -Topic "videoaccesos/${siteId}/status" -Data $heartbeat
    }

    Log-Info "Heartbeat: state=$($script:AgentState) mqtt=$($script:MqttConnected) mem=${memMB}MB streaming=$($script:StreamingCams.Count)"
}

# ============================================================================
# INICIALIZACION
# ============================================================================
function Initialize-Agent {
    $script:Config = Get-Content $ConfigPath -Raw | ConvertFrom-Json

    # Asegurar seccion MQTT en config (retrocompatibilidad con configs viejas)
    if (-not $script:Config.mqtt) {
        $script:Config | Add-Member -NotePropertyName "mqtt" -NotePropertyValue @{
            broker = "50.62.182.131"
            port = 1883
            username = "admin"
            password = "v1de0acces0s"
        }
    }

    # Crear directorio de logs
    $logDir = Join-Path $PSScriptRoot $script:Config.log.path
    if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir -Force | Out-Null }

    # Rotacion de logs (>7 dias)
    try {
        $cutoff = (Get-Date).AddDays(-7)
        Get-ChildItem -Path $logDir -Filter "agent-*.log" -ErrorAction SilentlyContinue |
            Where-Object { $_.LastWriteTime -lt $cutoff } |
            ForEach-Object { Remove-Item $_.FullName -Force -ErrorAction SilentlyContinue }
    } catch {}

    $logDate = Get-Date -Format "yyyy-MM-dd"
    $script:LogFile = Join-Path $logDir "agent-$logDate.log"

    Log-Info "=== Agente de captura iniciando (v2.0 MQTT) ==="
    Log-Info "Site ID: $($script:Config.site_id)"
    Log-Info "Backend: $($script:Config.backend_url)"
    Log-Info "MQTT: $($script:Config.mqtt.broker):$($script:Config.mqtt.port)"
    Log-Info "Camaras config: $($script:Config.cameras.Count)"

    Initialize-RunspacePool
    Explore-DVR

    # Conectar MQTT
    $mqttOk = Connect-MqttBroker
    if (-not $mqttOk) {
        Log-Warn "MQTT no disponible, usando solo HTTP polling como fallback"
    }

    $script:AgentState = "idle"
    Log-Info "Agente listo - esperando comandos via MQTT"
}

# ============================================================================
# POLLING HTTP (fallback cuando MQTT no esta disponible)
# ============================================================================
$script:PollUrl = $null
$script:LastPollTime = [DateTime]::MinValue

function Get-PendingCommands {
    if (-not $script:PollUrl) {
        $baseUrl = $script:Config.backend_url -replace '/+$', ''
        $script:PollUrl = "$baseUrl/poll?site_id=$($script:Config.site_id)"
    }
    if (((Get-Date) - $script:LastPollTime).TotalSeconds -lt 2) { return @() }
    $script:LastPollTime = Get-Date

    $response = $null
    $reader = $null
    try {
        $request = [System.Net.HttpWebRequest]::Create($script:PollUrl)
        $request.Method = "GET"
        $request.Timeout = 5000
        $request.KeepAlive = $false
        $request.Headers.Add("X-Agent-Token", $script:Config.agent_token)
        $request.UserAgent = "CaptureAgent/2.0"

        $response = $request.GetResponse()
        $reader = New-Object System.IO.StreamReader($response.GetResponseStream())
        $body = $reader.ReadToEnd()
        $result = $body | ConvertFrom-Json

        if ($result.commands -and $result.commands.Count -gt 0) {
            Log-Info "HTTP Poll: $($result.commands.Count) comando(s)"
            return $result.commands
        }
    } catch {
        Log-Debug "Poll error: $($_.Exception.Message)"
        return $null
    } finally {
        if ($reader) { try { $reader.Close(); $reader.Dispose() } catch {} }
        if ($response) { try { $response.Close(); $response.Dispose() } catch {} }
    }
    return @()
}

# ============================================================================
# LOOP PRINCIPAL
# ============================================================================
$script:LoopIteration = 0
$script:LastGC = [DateTime]::MinValue
$script:LastChannelReport = [DateTime]::MinValue
$script:MqttReconnectDelay = 5

function Start-AgentLoop {
    Log-Info "Iniciando loop principal..."

    while (-not $script:StopRequested) {
        try {
            $script:LoopIteration++

            # --- MQTT: leer mensajes y mantener conexion ---
            if ($script:MqttConnected) {
                Read-MqttMessages
                Send-MqttPing

                # Detectar desconexion (sin respuesta en 2x keepalive)
                if (((Get-Date) - $script:MqttLastMessage).TotalSeconds -gt ($script:MqttKeepalive * 2.5)) {
                    Log-Warn "MQTT: sin respuesta, reconectando..."
                    $script:MqttConnected = $false
                }
            }

            # --- Reconexion MQTT ---
            if (-not $script:MqttConnected) {
                $script:MqttReconnectDelay = [Math]::Min($script:MqttReconnectDelay, 60)
                if ($script:LoopIteration % [Math]::Max(($script:MqttReconnectDelay * 10), 50) -eq 0) {
                    Log-Info "MQTT: Reintentando conexion..."
                    $ok = Connect-MqttBroker
                    if ($ok) {
                        $script:MqttReconnectDelay = 5
                        # Re-reportar canales al reconectar
                        Report-Channels
                    } else {
                        $script:MqttReconnectDelay = [Math]::Min($script:MqttReconnectDelay * 2, 60)
                    }
                }
            }

            # --- HTTP polling (fallback cuando MQTT no esta conectado) ---
            if (-not $script:MqttConnected) {
                $cmds = Get-PendingCommands
                if ($null -ne $cmds -and $cmds.Count -gt 0) {
                    $lastCmd = $cmds[$cmds.Count - 1]
                    if ($cmds.Count -gt 1) {
                        Log-Info "Descartando $($cmds.Count - 1) comando(s) obsoletos"
                    }
                    Process-Command -Cmd $lastCmd
                }
            }

            # --- Captura de frames ---
            if ($script:StreamingCams.Count -gt 0) {
                Invoke-CaptureLoop
                Start-Sleep -Milliseconds 40
            } else {
                Start-Sleep -Milliseconds 100
            }

            # --- Heartbeat ---
            Send-Heartbeat

            # --- Re-reportar canales cada 60s ---
            if (((Get-Date) - $script:LastChannelReport).TotalSeconds -ge 60) {
                Report-Channels
                $script:LastChannelReport = Get-Date
            }

            # --- GC cada 5 minutos ---
            if (((Get-Date) - $script:LastGC).TotalMinutes -ge 5) {
                $script:LastGC = Get-Date
                [System.GC]::Collect()
                [System.GC]::WaitForPendingFinalizers()
            }

            # --- Rotar log a medianoche ---
            $today = Get-Date -Format "yyyy-MM-dd"
            $logDir = Join-Path $PSScriptRoot $script:Config.log.path
            $expectedPath = Join-Path $logDir "agent-$today.log"
            if ($script:LogFile -ne $expectedPath) {
                Log-Info "Rotando log -> agent-$today.log"
                $script:LogFile = $expectedPath
            }

        } catch {
            Log-Error "Error en loop: $($_.Exception.Message)"
            Start-Sleep -Seconds 5
        }
    }

    # Desconectar MQTT limpiamente
    Disconnect-MqttBroker
    Log-Info "=== Agente detenido ==="
}

# ============================================================================
# PUNTO DE ENTRADA
# ============================================================================
try { [Console]::TreatControlCAsInput = $false } catch {}
trap { $script:StopRequested = $true; continue }

try {
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12
    [System.Net.ServicePointManager]::DefaultConnectionLimit = 50
} catch {}

# --- PASO 1: Setup wizard si no hay config ---
if (-not (Test-Path $ConfigPath)) { Run-SetupWizard }

# --- PASO 2: Instalar tarea programada ---
$taskInstalled = Install-AsScheduledTask

# --- PASO 2b: Delegar a tarea si fue ejecutado interactivamente ---
if (-not $RunAsService -and $taskInstalled) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  AGENTE INSTALADO (MQTT + HTTP)" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Iniciando tarea programada en background..." -ForegroundColor Cyan

    Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    $lockFile = Join-Path $PSScriptRoot "agent.lock"
    Remove-Item $lockFile -Force -ErrorAction SilentlyContinue
    Start-ScheduledTask -TaskName $TaskName
    Start-Sleep -Seconds 3

    $taskState = (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue).State
    if ($taskState -eq "Running") {
        Write-Host "El agente esta corriendo en BACKGROUND." -ForegroundColor Green
        Write-Host "Puedes cerrar esta ventana." -ForegroundColor Green
        Write-Host ""
        Write-Host "  Estado:      Get-ScheduledTask -TaskName '$TaskName'" -ForegroundColor Gray
        Write-Host "  Detener:     Stop-ScheduledTask '$TaskName'" -ForegroundColor Gray
        Write-Host "  Ver logs:    Get-Content $PSScriptRoot\logs\*.log -Tail 20" -ForegroundColor Gray
        Write-Host "  Desinstalar: .\CaptureAgent.ps1 -Uninstall" -ForegroundColor Gray
        Write-Host ""
        Write-Host "Cerrando en 10 segundos..." -ForegroundColor Yellow
        Start-Sleep -Seconds 10
    } else {
        Write-Host "AVISO: La tarea no inicio (estado: $taskState). Ejecutando en esta ventana..." -ForegroundColor Yellow
        $RunAsService = $true
    }
    if (-not $RunAsService) { exit 0 }
}

if (-not $RunAsService -and -not $taskInstalled) {
    Write-Host "AVISO: Modo manual. Si cierras esta ventana, el agente se detiene." -ForegroundColor Yellow
}

# --- PASO 3: Lock file (evitar instancias duplicadas) ---
$lockFile = Join-Path $PSScriptRoot "agent.lock"
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
$PID | Set-Content $lockFile -Force

Register-EngineEvent -SourceIdentifier PowerShell.Exiting -Action {
    Remove-Item $lockFile -Force -ErrorAction SilentlyContinue
} -ErrorAction SilentlyContinue | Out-Null

# --- PASO 4: Ejecutar con auto-reinicio ---
$restartCount = 0
$maxRestarts = 100

while ($restartCount -lt $maxRestarts) {
    try {
        Initialize-Agent
        Start-AgentLoop
        break
    } catch {
        $restartCount++
        $errMsg = $_.Exception.Message
        try { Log-Error "CRASH #${restartCount}: $errMsg" } catch {}
        Write-Host "ERROR FATAL #${restartCount}: $errMsg" -ForegroundColor Red

        Disconnect-MqttBroker
        if ($script:RunspacePool) {
            try { $script:RunspacePool.Close() } catch {}
            try { $script:RunspacePool.Dispose() } catch {}
            $script:RunspacePool = $null
        }
        $script:StreamingCams = @{}
        $script:StreamTimeout = @{}

        [System.GC]::Collect()
        Start-Sleep -Seconds 10
    }
}

Remove-Item $lockFile -Force -ErrorAction SilentlyContinue

if ($restartCount -ge $maxRestarts) {
    try { Log-Error "Limite de reinicios ($maxRestarts). La tarea programada relanzara." } catch {}
    exit 1
}
