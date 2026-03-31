#!/bin/bash
# Instalacion del ZK C3-400 MQTT Bridge en Ubuntu/Linux
# Uso: bash install.sh

set -e

echo "============================================"
echo "  ZK C3-400 MQTT Bridge - Instalacion"
echo "============================================"
echo

# Verificar Python 3.8+
if ! command -v python3 &> /dev/null; then
    echo "[ERROR] Python3 no encontrado. Instalar con:"
    echo "  sudo apt install python3 python3-pip python3-venv"
    exit 1
fi

PYVER=$(python3 -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')")
echo "[OK] Python $PYVER encontrado"

# Directorio del script
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# Crear entorno virtual
echo
echo "[1/4] Creando entorno virtual..."
python3 -m venv venv
source venv/bin/activate

# Instalar dependencias
echo "[2/4] Instalando dependencias..."
pip install --upgrade pip
pip install -r requirements.txt

echo
echo "[3/4] Verificando instalacion..."
python3 -c "
import paho.mqtt.client as mqtt
print('  [OK] paho-mqtt:', mqtt.__version__ if hasattr(mqtt, '__version__') else 'instalado')

import yaml
print('  [OK] PyYAML:', yaml.__version__)

try:
    import zkaccess_c3
    print('  [OK] zkaccess-c3: instalado (Python puro, Linux nativo)')
except ImportError:
    print('  [WARN] zkaccess-c3: no disponible, se usara protocolo TCP directo')
"

echo
echo "[4/4] Configuracion"
if [ ! -f "config.local.yaml" ]; then
    cp config.yaml config.local.yaml
    echo "  Creado: config.local.yaml (copia para editar)"
    echo "  EDITAR este archivo con los datos de tu sitio:"
    echo "    nano $SCRIPT_DIR/config.local.yaml"
else
    echo "  config.local.yaml ya existe (no se sobreescribio)"
fi

echo
echo "============================================"
echo "  Instalacion completada!"
echo "============================================"
echo
echo "Pasos siguientes:"
echo
echo "  1. Editar configuracion:"
echo "     nano $SCRIPT_DIR/config.local.yaml"
echo
echo "  2. Probar conexion al panel:"
echo "     cd $SCRIPT_DIR"
echo "     source venv/bin/activate"
echo "     python3 test_connection.py miguel.ddns.accessbot.net 4370"
echo
echo "  3. Probar bridge completo:"
echo "     python3 bridge.py -c config.local.yaml --test"
echo
echo "  4. Ejecutar bridge:"
echo "     python3 bridge.py -c config.local.yaml"
echo
echo "  5. Instalar como servicio systemd:"
echo "     sudo bash install_service.sh"
echo
