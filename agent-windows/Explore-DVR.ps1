<#
.SYNOPSIS
    Explora canales de un DVR Hikvision y muestra cuales tienen imagen.

.DESCRIPTION
    Pide la IP del DVR, prueba canales 1-16 (main y sub-stream),
    obtiene el nombre del canal y verifica si entrega imagen JPEG.

.NOTES
    Ejecutar: .\Explore-DVR.ps1
#>

param(
    [string]$DvrIp,
    [string]$Username = "admin",
    [string]$Password = "v1de0acces0s"
)

if (-not $DvrIp) {
    $DvrIp = Read-Host "IP del DVR"
}

$secPass = ConvertTo-SecureString $Password -AsPlainText -Force
$cred = New-Object System.Management.Automation.PSCredential($Username, $secPass)

Write-Host ""
Write-Host "=== Explorando DVR en $DvrIp ===" -ForegroundColor Cyan
Write-Host "Usuario: $Username"
Write-Host ""

# Intentar obtener info del dispositivo
try {
    $devInfo = Invoke-WebRequest -Uri "http://${DvrIp}/ISAPI/System/deviceInfo" -Credential $cred -TimeoutSec 5 -UseBasicParsing
    if ($devInfo.Content -match "<deviceName>(.*?)</deviceName>") { Write-Host "Dispositivo: $($Matches[1])" -ForegroundColor Green }
    if ($devInfo.Content -match "<model>(.*?)</model>") { Write-Host "Modelo:      $($Matches[1])" -ForegroundColor Green }
    if ($devInfo.Content -match "<serialNumber>(.*?)</serialNumber>") { Write-Host "Serie:       $($Matches[1])" -ForegroundColor Green }
    Write-Host ""
} catch {
    Write-Host "No se pudo obtener info del dispositivo: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host ""
}

# Intentar obtener nombres de canales via ISAPI
$channelNames = @{}
try {
    $channels = Invoke-WebRequest -Uri "http://${DvrIp}/ISAPI/System/Video/inputs/channels" -Credential $cred -TimeoutSec 5 -UseBasicParsing
    $xml = [xml]$channels.Content
    foreach ($ch in $xml.VideoInputChannelList.VideoInputChannel) {
        $id = $ch.id
        $name = $ch.name
        if ($id -and $name) { $channelNames[[int]$id] = $name }
    }
} catch {}

# Tambien intentar nombres de canales IP
try {
    $ipChannels = Invoke-WebRequest -Uri "http://${DvrIp}/ISAPI/ContentMgmt/InputProxy/channels" -Credential $cred -TimeoutSec 5 -UseBasicParsing
    $xml2 = [xml]$ipChannels.Content
    foreach ($ch in $xml2.InputProxyChannelList.InputProxyChannel) {
        $id = $ch.id
        $name = $ch.name
        if ($id -and $name) { $channelNames[[int]$id] = $name }
    }
} catch {}

Write-Host ("{0,-6} {1,-8} {2,-12} {3,-25} {4}" -f "CANAL", "STREAM", "ESTADO", "NOMBRE", "TAMANO")
Write-Host ("{0,-6} {1,-8} {2,-12} {3,-25} {4}" -f "-----", "------", "------", "------", "------")

$results = @()

for ($ch = 1; $ch -le 16; $ch++) {
    foreach ($stream in @(@{id="01";label="main"}, @{id="02";label="sub"})) {
        $chCode = "$ch$($stream.id)"
        $url = "http://${DvrIp}/ISAPI/Streaming/channels/${chCode}/picture"
        $name = if ($channelNames.ContainsKey($ch)) { $channelNames[$ch] } else { "-" }

        try {
            $r = Invoke-WebRequest -Uri $url -Credential $cred -TimeoutSec 5 -UseBasicParsing
            $size = $r.Content.Length
            $sizeKb = [math]::Round($size / 1024, 1)
            $estado = "OK"
            $color = "Green"

            $results += [PSCustomObject]@{
                Canal = $ch
                Stream = $stream.label
                Code = $chCode
                Nombre = $name
                Bytes = $size
                URL = $url
            }

            Write-Host ("{0,-6} {1,-8} {2,-12} {3,-25} {4}" -f $ch, $stream.label, "OK", $name, "${sizeKb} KB") -ForegroundColor Green
        } catch {
            $msg = if ($_.Exception.Response) {
                $status = [int]$_.Exception.Response.StatusCode
                "HTTP $status"
            } else { "Sin respuesta" }
            Write-Host ("{0,-6} {1,-8} {2,-12} {3,-25}" -f $ch, $stream.label, $msg, $name) -ForegroundColor DarkGray
        }
    }
}

Write-Host ""
Write-Host "=== Resumen ===" -ForegroundColor Cyan
Write-Host "Canales con imagen: $($results.Count)" -ForegroundColor Green
Write-Host ""

if ($results.Count -gt 0) {
    Write-Host "Canales disponibles (sub-stream recomendado para el agente):" -ForegroundColor Yellow
    Write-Host ""
    $results | Where-Object { $_.Stream -eq "sub" } | ForEach-Object {
        Write-Host "  Canal $($_.Canal) ($($_.Nombre)): $($_.Code)/picture  [$([math]::Round($_.Bytes/1024,1)) KB]" -ForegroundColor White
    }

    Write-Host ""
    Write-Host "Ejemplo para config.json:" -ForegroundColor Yellow
    Write-Host ""

    $camIndex = 1
    $results | Where-Object { $_.Stream -eq "sub" } | ForEach-Object {
        $alias = if ($_.Nombre -ne "-") { $_.Nombre } else { "Camara $($_.Canal)" }
        Write-Host "    {"
        Write-Host "      `"cam_id`": $camIndex,"
        Write-Host "      `"alias`": `"$alias`","
        Write-Host "      `"snapshot_url`": `"http://${DvrIp}/ISAPI/Streaming/channels/$($_.Code)/picture`","
        Write-Host "      `"username`": `"$Username`","
        Write-Host "      `"password`": `"$Password`","
        Write-Host "      `"auth_type`": `"digest`""
        Write-Host "    },"
        $camIndex++
    }
}

Write-Host ""
