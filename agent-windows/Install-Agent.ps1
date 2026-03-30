<#
.SYNOPSIS
    Instala CaptureAgent + MqttListener como Tareas Programadas de Windows.

.DESCRIPTION
    Registra ambos servicios para arranque automatico con Windows:
    1. CaptureAgent  - captura frames y los envia al backend
    2. MqttListener  - escucha comandos MQTT y escribe cmd.json

    Ambos corren como SYSTEM, se reinician en fallo y arrancan al boot.

.NOTES
    Ejecutar como Administrador.
    Uso: .\Install-Agent.ps1 [-Uninstall]
#>

param(
    [switch]$Uninstall
)

$TaskAgent    = "VideoAccesos-CaptureAgent"
$TaskListener = "VideoAccesos-MqttListener"
$AgentScript  = Join-Path $PSScriptRoot "CaptureAgent.ps1"
$ListenerScript = Join-Path $PSScriptRoot "MqttListener.ps1"

# --- Desinstalar ---
if ($Uninstall) {
    Write-Host "Desinstalando tareas programadas..." -ForegroundColor Yellow
    Unregister-ScheduledTask -TaskName $TaskAgent -Confirm:$false -ErrorAction SilentlyContinue
    Unregister-ScheduledTask -TaskListener -Confirm:$false -ErrorAction SilentlyContinue
    # Fix: variable name typo above, use correct param
    Unregister-ScheduledTask -TaskName $TaskListener -Confirm:$false -ErrorAction SilentlyContinue
    Write-Host "Tareas eliminadas." -ForegroundColor Green
    exit 0
}

# --- Validaciones ---
if (-not (Test-Path $AgentScript)) {
    Write-Error "No se encuentra CaptureAgent.ps1 en $PSScriptRoot"
    exit 1
}
if (-not (Test-Path $ListenerScript)) {
    Write-Error "No se encuentra MqttListener.ps1 en $PSScriptRoot"
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
Write-Host "MqttListener:  $ListenerScript"
Write-Host "Config:        $configPath"
Write-Host ""

# --- Configuracion comun ---
$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RestartCount 5 `
    -RestartInterval (New-TimeSpan -Minutes 1) `
    -ExecutionTimeLimit (New-TimeSpan -Days 365)

$trigger = New-ScheduledTaskTrigger -AtStartup

# --- 1. Instalar CaptureAgent ---
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
    -Description "VideoAccesos: Agente de captura de frames. Permanece en IDLE y transmite cuando recibe comandos MQTT."

Write-Host "  $TaskAgent registrado OK" -ForegroundColor Green

# --- 2. Instalar MqttListener ---
Write-Host "Registrando tarea: $TaskListener..." -ForegroundColor Yellow

$existing2 = Get-ScheduledTask -TaskName $TaskListener -ErrorAction SilentlyContinue
if ($existing2) { Unregister-ScheduledTask -TaskName $TaskListener -Confirm:$false }

$actionListener = New-ScheduledTaskAction `
    -Execute "powershell.exe" `
    -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$ListenerScript`"" `
    -WorkingDirectory $PSScriptRoot

Register-ScheduledTask `
    -TaskName $TaskListener `
    -Action $actionListener `
    -Trigger $trigger `
    -Settings $settings `
    -User "SYSTEM" `
    -RunLevel Highest `
    -Description "VideoAccesos: Listener MQTT que recibe comandos start/stop y los pasa al CaptureAgent."

Write-Host "  $TaskListener registrado OK" -ForegroundColor Green

# --- Resumen ---
Write-Host ""
Write-Host "=== Instalacion completa ===" -ForegroundColor Green
Write-Host ""
Write-Host "Ambas tareas arrancaran automaticamente al iniciar Windows." -ForegroundColor Cyan
Write-Host ""
Write-Host "Comandos utiles:" -ForegroundColor Gray
Write-Host "  Iniciar ambos:     Start-ScheduledTask '$TaskAgent'; Start-ScheduledTask '$TaskListener'"
Write-Host "  Detener ambos:     Stop-ScheduledTask '$TaskAgent'; Stop-ScheduledTask '$TaskListener'"
Write-Host "  Ver estado:        Get-ScheduledTask | Where TaskName -like 'VideoAccesos*' | Format-Table TaskName, State"
Write-Host "  Desinstalar:       .\Install-Agent.ps1 -Uninstall"
Write-Host ""

# Preguntar si iniciar ahora
$startNow = Read-Host "Desea iniciar ambos servicios ahora? (S/N)"
if ($startNow -match "^[Ss]") {
    Write-Host "Iniciando servicios..." -ForegroundColor Cyan
    Start-ScheduledTask -TaskName $TaskAgent
    Start-ScheduledTask -TaskName $TaskListener
    Start-Sleep -Seconds 3
    Get-ScheduledTask | Where-Object { $_.TaskName -like "VideoAccesos*" } | Format-Table TaskName, State -AutoSize
}
