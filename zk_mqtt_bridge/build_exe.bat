@echo off
REM Compilar ZK MQTT Bridge como ejecutable standalone
REM Requisito: pip install pyinstaller

echo ========================================
echo  Compilando ZK MQTT Bridge
echo ========================================

pip install pyinstaller
pip install -r requirements.txt

pyinstaller --onefile --name zk_bridge ^
    --add-data "config.yaml;." ^
    --hidden-import paho.mqtt.client ^
    --hidden-import yaml ^
    --hidden-import c3 ^
    bridge.py

echo.
echo ========================================
if exist dist\zk_bridge.exe (
    echo  OK: dist\zk_bridge.exe creado
    echo.
    echo  Copiar a la PC destino:
    echo    dist\zk_bridge.exe
    echo    config.yaml (editar con datos reales)
) else (
    echo  ERROR: No se genero el ejecutable
)
echo ========================================
pause
