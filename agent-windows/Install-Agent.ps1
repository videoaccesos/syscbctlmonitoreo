<#
.SYNOPSIS
    Instala CaptureAgent como Tarea Programada de Windows.

.DESCRIPTION
    Registra el agente de captura para arranque automatico con Windows.
    Captura frames del DVR por LAN y los envia al servidor por HTTPS.
    Recibe comandos via polling HTTP (no requiere software adicional).

    Corre como SYSTEM, se reinicia en fallo y arranca al boot.

.NOTES
    Ejecutar como Administrador.
    Uso: .\Install-Agent.ps1 [-Uninstall]
#>

param(
    [switch]$Uninstall
)

$TaskAgent   = "VideoAccesos-CaptureAgent"
$AgentScript = Join-Path $PSScriptRoot "CaptureAgent.ps1"

# --- Desinstalar ---
if ($Uninstall) {
    Write-Host "Desinstalando tarea programada..." -ForegroundColor Yellow
    Unregister-ScheduledTask -TaskName $TaskAgent -Confirm:$false -ErrorAction SilentlyContinue
    # Limpiar tarea legacy de MqttListener si existe
    Unregister-ScheduledTask -TaskName "VideoAccesos-MqttListener" -Confirm:$false -ErrorAction SilentlyContinue
    Write-Host "Tarea eliminada." -ForegroundColor Green
    exit 0
}

# --- Validaciones ---
if (-not (Test-Path $AgentScript)) {
    Write-Error "No se encuentra CaptureAgent.ps1 en $PSScriptRoot"
    exit 1
}

$configPath = Join-Path $PSScriptRoot "config.json"
if (-not (Test-Path $configPath)) {
    Write-Warning "No se encuentra config.json. Copie config.example.json a config.json y configure."
    exit 1
}

$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
    [Security.Principal.WindowsBuiltInRole]::Administrator
)
if (-not $isAdmin) {
    Write-Error "Este script requiere permisos de Administrador."
    exit 1
}

Write-Host "=== Instalacion de Agente de Captura VideoAccesos ===" -ForegroundColor Cyan
Write-Host "CaptureAgent:  $AgentScript"
Write-Host "Config:        $configPath"
Write-Host ""

# --- Limpiar tarea legacy de MqttListener si existe ---
$legacyTask = Get-ScheduledTask -TaskName "VideoAccesos-MqttListener" -ErrorAction SilentlyContinue
if ($legacyTask) {
    Write-Host "Eliminando tarea legacy MqttListener..." -ForegroundColor Yellow
    Stop-ScheduledTask -TaskName "VideoAccesos-MqttListener" -ErrorAction SilentlyContinue
    Unregister-ScheduledTask -TaskName "VideoAccesos-MqttListener" -Confirm:$false
    Write-Host "  MqttListener eliminado" -ForegroundColor Green
}

# --- Configuracion ---
$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RestartCount 5 `
    -RestartInterval (New-TimeSpan -Minutes 1) `
    -ExecutionTimeLimit (New-TimeSpan -Days 365)

$trigger = New-ScheduledTaskTrigger -AtStartup

# --- Instalar CaptureAgent ---
Write-Host "Registrando tarea: $TaskAgent..." -ForegroundColor Yellow

$existing = Get-ScheduledTask -TaskName $TaskAgent -ErrorAction SilentlyContinue
if ($existing) { Unregister-ScheduledTask -TaskName $TaskAgent -Confirm:$false }

$actionAgent = New-ScheduledTaskAction `
    -Execute "powershell.exe" `
    -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$AgentScript`"" `
    -WorkingDirectory $PSScriptRoot

Register-ScheduledTask `
    -TaskName $TaskAgent `
    -Action $actionAgent `
    -Trigger $trigger `
    -Settings $settings `
    -User "SYSTEM" `
    -RunLevel Highest `
    -Description "VideoAccesos: Agente de captura de frames. Captura del DVR por LAN, envia al servidor por HTTPS, recibe comandos por polling HTTP."

Write-Host "  $TaskAgent registrado OK" -ForegroundColor Green

# --- Resumen ---
Write-Host ""
Write-Host "=== Instalacion completa ===" -ForegroundColor Green
Write-Host ""
Write-Host "La tarea arrancara automaticamente al iniciar Windows." -ForegroundColor Cyan
Write-Host ""
Write-Host "Comandos utiles:" -ForegroundColor Gray
Write-Host "  Iniciar:       Start-ScheduledTask '$TaskAgent'"
Write-Host "  Detener:       Stop-ScheduledTask '$TaskAgent'"
Write-Host "  Reiniciar:     Stop-ScheduledTask '$TaskAgent'; Start-Sleep 3; Start-ScheduledTask '$TaskAgent'"
Write-Host "  Ver estado:    Get-ScheduledTask -TaskName '$TaskAgent' | Format-Table TaskName, State"
Write-Host "  Ver logs:      Get-Content $PSScriptRoot\logs\*.log -Tail 20"
Write-Host "  Desinstalar:   .\Install-Agent.ps1 -Uninstall"
Write-Host ""

# Preguntar si iniciar ahora
$startNow = Read-Host "Desea iniciar el servicio ahora? (S/N)"
if ($startNow -match "^[Ss]") {
    Write-Host "Iniciando servicio..." -ForegroundColor Cyan
    Start-ScheduledTask -TaskName $TaskAgent
    Start-Sleep -Seconds 3
    Get-ScheduledTask -TaskName $TaskAgent | Format-Table TaskName, State -AutoSize
}
