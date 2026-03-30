<#
.SYNOPSIS
    Listener MQTT auxiliar que escribe cmd.json cuando recibe un comando.

.DESCRIPTION
    Usa mosquitto_sub (cliente MQTT de linea de comandos) para suscribirse
    al topico de comandos del sitio. Cuando llega un mensaje, lo escribe
    en cmd.json para que CaptureAgent.ps1 lo procese.

    Requiere: mosquitto_sub.exe en PATH o en la misma carpeta.
    Descargar de: https://mosquitto.org/download/

.NOTES
    Ejecutar en paralelo con CaptureAgent.ps1 o integrar en la misma
    Tarea Programada via un wrapper.
#>

param(
    [string]$ConfigPath = (Join-Path $PSScriptRoot "config.json")
)

$ErrorActionPreference = "Continue"

# Cargar config
if (-not (Test-Path $ConfigPath)) {
    Write-Error "Config no encontrado: $ConfigPath"
    exit 1
}

$config = Get-Content $ConfigPath -Raw | ConvertFrom-Json
$broker = $config.mqtt.broker
$port = $config.mqtt.port
$siteId = $config.site_id
$username = $config.mqtt.username
$password = $config.mqtt.password
$cmdFile = Join-Path $PSScriptRoot "cmd.json"

# Topicos a suscribir (comandos para este sitio)
$topics = @(
    "site/$siteId/cam/+/cmd",
    "site/$siteId/agent/cmd"
)

# Buscar mosquitto_sub
$mosquittoSub = Get-Command "mosquitto_sub" -ErrorAction SilentlyContinue
if (-not $mosquittoSub) {
    $localPath = Join-Path $PSScriptRoot "mosquitto_sub.exe"
    if (Test-Path $localPath) {
        $mosquittoSub = $localPath
    } else {
        Write-Error "mosquitto_sub no encontrado. Instale Mosquitto o copie mosquitto_sub.exe aqui."
        Write-Host "Descarga: https://mosquitto.org/download/" -ForegroundColor Yellow
        exit 1
    }
}

$mosquittoExe = if ($mosquittoSub -is [System.Management.Automation.ApplicationInfo]) {
    $mosquittoSub.Source
} else {
    $mosquittoSub
}

Write-Host "=== MQTT Listener para CaptureAgent ===" -ForegroundColor Cyan
Write-Host "Broker: ${broker}:${port}"
Write-Host "Site: $siteId"
Write-Host "Topics: $($topics -join ', ')"
Write-Host ""

# Loop de reconexion
while ($true) {
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Conectando a MQTT..." -ForegroundColor Yellow

    # Construir argumentos
    $args = @(
        "-h", $broker,
        "-p", $port,
        "-v"  # verbose: muestra topico + payload
    )

    # Agregar cada topico
    foreach ($t in $topics) {
        $args += "-t"
        $args += $t
    }

    # Credenciales si hay
    if ($username) {
        $args += "-u"
        $args += $username
        if ($password) {
            $args += "-P"
            $args += $password
        }
    }

    # Client ID unico
    $clientId = "$($config.mqtt.client_id_prefix)-listener-$siteId"
    $args += "-i"
    $args += $clientId

    # Ejecutar mosquitto_sub y procesar cada linea
    try {
        $process = Start-Process -FilePath $mosquittoExe -ArgumentList $args `
            -NoNewWindow -PassThru -RedirectStandardOutput "mqtt_output.tmp" `
            -RedirectStandardError "mqtt_error.tmp"

        # Leer output linea por linea
        Start-Sleep -Seconds 2
        $reader = [System.IO.File]::Open("mqtt_output.tmp", "Open", "Read", "ReadWrite")
        $sr = New-Object System.IO.StreamReader($reader)

        Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Conectado. Escuchando comandos..." -ForegroundColor Green

        while (-not $process.HasExited) {
            $line = $sr.ReadLine()
            if ($line) {
                # Formato: topico payload
                $spaceIdx = $line.IndexOf(" ")
                if ($spaceIdx -gt 0) {
                    $topic = $line.Substring(0, $spaceIdx)
                    $payload = $line.Substring($spaceIdx + 1)

                    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] MQTT: $topic -> $payload" -ForegroundColor Magenta

                    try {
                        # Validar que es JSON y escribir como cmd.json
                        $cmdObj = $payload | ConvertFrom-Json

                        # Extraer cam_id del topico si aplica
                        if ($topic -match "site/\d+/cam/(\d+)/cmd") {
                            $cmdObj | Add-Member -NotePropertyName "cam_id" -NotePropertyValue ([int]$Matches[1]) -Force
                        }

                        $cmdObj | ConvertTo-Json -Compress | Set-Content -Path $cmdFile -Force
                        Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Comando escrito en cmd.json" -ForegroundColor Green
                    } catch {
                        Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Payload no es JSON valido: $payload" -ForegroundColor Red
                    }
                }
            } else {
                Start-Sleep -Milliseconds 200
            }
        }

        $sr.Close()
        $reader.Close()
    } catch {
        Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Error: $($_.Exception.Message)" -ForegroundColor Red
    }

    # Reconexion con backoff
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Desconectado. Reconectando en 5s..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5
}
