@echo off
REM Desinstalar tarea programada ZK MQTT Bridge
REM Ejecutar como Administrador

SET TASK_NAME=ZK_MQTT_Bridge

net session >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Ejecutar como Administrador
    pause
    exit /b 1
)

echo Deteniendo tarea...
schtasks /end /tn "%TASK_NAME%" /f >nul 2>&1

echo Eliminando tarea...
schtasks /delete /tn "%TASK_NAME%" /f

if %errorlevel% equ 0 (
    echo Tarea "%TASK_NAME%" eliminada correctamente
) else (
    echo No se encontro la tarea "%TASK_NAME%"
)

pause
