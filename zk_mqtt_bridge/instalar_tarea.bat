@echo off
REM ============================================================
REM  Instalador de tarea programada para ZK MQTT Bridge
REM  Ejecutar como Administrador
REM ============================================================
REM
REM  Dos modos disponibles:
REM
REM  MODO A - CONTINUO (tiempo real):
REM    El bridge corre permanentemente, polling cada 2s.
REM    La tarea lo arranca al iniciar Windows y lo reinicia si se cae.
REM
REM  MODO B - BATCH (sync periodico):
REM    Ejecuta sync cada 5 minutos: lee eventos, usuarios,
REM    transacciones, publica por MQTT y sale.
REM
REM  Por defecto se instala MODO A. Para cambiar a MODO B,
REM  editar la variable MODO abajo.
REM ============================================================

REM === CONFIGURACION - EDITAR AQUI ===
SET MODO=A
SET INSTALL_DIR=C:\ZK_Bridge
SET CONFIG_FILE=config.yaml
SET TASK_NAME=ZK_MQTT_Bridge
REM ====================================

echo.
echo  ZK MQTT Bridge - Instalador de Tarea Programada
echo  ================================================
echo.

REM Verificar permisos de administrador
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo  ERROR: Ejecutar como Administrador
    echo  Click derecho -^> Ejecutar como administrador
    pause
    exit /b 1
)

REM Crear directorio de instalacion
if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"

REM Copiar archivos
echo  Copiando archivos a %INSTALL_DIR%...
copy /Y zk_bridge.exe "%INSTALL_DIR%\" >nul 2>&1
if not exist "%INSTALL_DIR%\zk_bridge.exe" (
    REM Intentar desde dist\ (si se compilo localmente)
    copy /Y dist\zk_bridge.exe "%INSTALL_DIR%\" >nul 2>&1
)
if not exist "%INSTALL_DIR%\zk_bridge.exe" (
    echo  ERROR: No se encuentra zk_bridge.exe
    echo  Compilar primero con build_exe.bat o copiar el .exe aqui
    pause
    exit /b 1
)

if not exist "%INSTALL_DIR%\%CONFIG_FILE%" (
    copy /Y "%CONFIG_FILE%" "%INSTALL_DIR%\" >nul 2>&1
    echo.
    echo  IMPORTANTE: Editar %INSTALL_DIR%\%CONFIG_FILE%
    echo  con la IP del panel y datos del broker MQTT
    echo.
)

REM Eliminar tarea existente si hay
schtasks /delete /tn "%TASK_NAME%" /f >nul 2>&1

if "%MODO%"=="A" (
    echo  Instalando MODO A - Continuo (tiempo real)
    echo.

    REM Tarea que arranca al iniciar Windows, corre indefinidamente
    REM Se reinicia automaticamente si falla (cada 1 minuto, hasta 3 veces)
    schtasks /create ^
        /tn "%TASK_NAME%" ^
        /tr "\"%INSTALL_DIR%\zk_bridge.exe\" -c \"%INSTALL_DIR%\%CONFIG_FILE%\"" ^
        /sc onstart ^
        /ru SYSTEM ^
        /rl HIGHEST ^
        /f

    REM Configurar reinicio en caso de fallo via XML
    echo  Configurando reinicio automatico en caso de fallo...

) else (
    echo  Instalando MODO B - Batch (sync cada 5 minutos)
    echo.

    schtasks /create ^
        /tn "%TASK_NAME%" ^
        /tr "\"%INSTALL_DIR%\zk_bridge.exe\" -c \"%INSTALL_DIR%\%CONFIG_FILE%\" --sync" ^
        /sc minute /mo 5 ^
        /ru SYSTEM ^
        /rl HIGHEST ^
        /f
)

if %errorlevel% equ 0 (
    echo.
    echo  ================================================
    echo  Tarea "%TASK_NAME%" instalada correctamente
    echo  Modo: %MODO%
    echo  Directorio: %INSTALL_DIR%
    echo.
    echo  Comandos utiles:
    echo    schtasks /run /tn "%TASK_NAME%"       - Ejecutar ahora
    echo    schtasks /end /tn "%TASK_NAME%"       - Detener
    echo    schtasks /query /tn "%TASK_NAME%" /v   - Ver estado
    echo    schtasks /delete /tn "%TASK_NAME%" /f  - Eliminar tarea
    echo  ================================================
) else (
    echo.
    echo  ERROR instalando tarea programada
)

echo.
pause
