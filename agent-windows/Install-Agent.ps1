<#
.SYNOPSIS
    Instala el agente de captura como Tarea Programada de Windows.

.DESCRIPTION
    Registra CaptureAgent.ps1 para que arranque automaticamente con Windows
    y se reinicie en caso de fallo.

.NOTES
    Ejecutar como Administrador.
    Uso: .\Install-Agent.ps1 [-Uninstall]
#>

param(
    [switch]$Uninstall
)

$TaskName = "CaptureAgent-VideoAccesos"
$ScriptPath = Join-Path $PSScriptRoot "CaptureAgent.ps1"

if ($Uninstall) {
    Write-Host "Desinstalando tarea programada '$TaskName'..." -ForegroundColor Yellow
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
    Write-Host "Tarea eliminada." -ForegroundColor Green
    exit 0
}

# Verificar que existe el script
if (-not (Test-Path $ScriptPath)) {
    Write-Error "No se encuentra CaptureAgent.ps1 en $PSScriptRoot"
    exit 1
}

# Verificar que existe config.json
$configPath = Join-Path $PSScriptRoot "config.json"
if (-not (Test-Path $configPath)) {
    Write-Warning "No se encuentra config.json. Copie config.example.json a config.json y configure."
    exit 1
}

# Verificar permisos de administrador
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
    [Security.Principal.WindowsBuiltInRole]::Administrator
)
if (-not $isAdmin) {
    Write-Error "Este script requiere permisos de Administrador."
    Write-Host "Ejecute PowerShell como Administrador e intente de nuevo." -ForegroundColor Yellow
    exit 1
}

Write-Host "=== Instalacion del Agente de Captura ===" -ForegroundColor Cyan
Write-Host "Script: $ScriptPath"
Write-Host "Config: $configPath"
Write-Host ""

# Eliminar tarea existente si hay
$existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($existing) {
    Write-Host "Eliminando tarea existente..." -ForegroundColor Yellow
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
}

# Crear accion - ejecutar PowerShell con el script
$action = New-ScheduledTaskAction `
    -Execute "powershell.exe" `
    -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$ScriptPath`"" `
    -WorkingDirectory $PSScriptRoot

# Trigger: al iniciar sesion de cualquier usuario
$trigger = New-ScheduledTaskTrigger -AtStartup

# Settings: reiniciar en fallo, no detener si tarda
$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RestartCount 3 `
    -RestartInterval (New-TimeSpan -Minutes 1) `
    -ExecutionTimeLimit (New-TimeSpan -Days 365)

# Registrar tarea como SYSTEM para que corra sin usuario logueado
Register-ScheduledTask `
    -TaskName $TaskName `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -User "SYSTEM" `
    -RunLevel Highest `
    -Description "Agente de captura de frames de camaras para VideoAccesos. Arranca automaticamente y escucha comandos para transmitir snapshots al backend central."

Write-Host ""
Write-Host "Tarea programada '$TaskName' creada exitosamente." -ForegroundColor Green
Write-Host ""
Write-Host "La tarea se ejecutara automaticamente al iniciar Windows." -ForegroundColor Cyan
Write-Host "Para iniciar manualmente:  Start-ScheduledTask -TaskName '$TaskName'" -ForegroundColor Gray
Write-Host "Para detener:              Stop-ScheduledTask -TaskName '$TaskName'" -ForegroundColor Gray
Write-Host "Para desinstalar:          .\Install-Agent.ps1 -Uninstall" -ForegroundColor Gray
Write-Host ""

# Preguntar si iniciar ahora
$startNow = Read-Host "Desea iniciar el agente ahora? (S/N)"
if ($startNow -match "^[Ss]") {
    Write-Host "Iniciando agente..." -ForegroundColor Cyan
    Start-ScheduledTask -TaskName $TaskName
    Start-Sleep -Seconds 2
    $task = Get-ScheduledTask -TaskName $TaskName
    Write-Host "Estado: $($task.State)" -ForegroundColor $(if ($task.State -eq "Running") { "Green" } else { "Yellow" })
}
