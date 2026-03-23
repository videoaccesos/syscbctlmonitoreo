#!/bin/bash
# Instala el ZK MQTT Bridge como servicio systemd
# Uso: sudo bash install_service.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SERVICE_NAME="zk-mqtt-bridge"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
PYTHON_BIN="$SCRIPT_DIR/venv/bin/python3"
CONFIG_FILE="$SCRIPT_DIR/config.local.yaml"

if [ ! -f "$CONFIG_FILE" ]; then
    CONFIG_FILE="$SCRIPT_DIR/config.yaml"
fi

if [ ! -f "$PYTHON_BIN" ]; then
    echo "[ERROR] Entorno virtual no encontrado. Ejecutar primero:"
    echo "  bash install.sh"
    exit 1
fi

echo "Creando servicio systemd: $SERVICE_NAME"

cat > "$SERVICE_FILE" << EOF
[Unit]
Description=ZK C3-400 MQTT Bridge
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=$SCRIPT_DIR
ExecStart=$PYTHON_BIN $SCRIPT_DIR/bridge.py -c $CONFIG_FILE
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

# Seguridad basica
NoNewPrivileges=true
ProtectSystem=strict
ReadWritePaths=$SCRIPT_DIR

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable "$SERVICE_NAME"

echo
echo "[OK] Servicio instalado: $SERVICE_NAME"
echo
echo "Comandos utiles:"
echo "  sudo systemctl start $SERVICE_NAME    # Iniciar"
echo "  sudo systemctl stop $SERVICE_NAME     # Detener"
echo "  sudo systemctl status $SERVICE_NAME   # Estado"
echo "  sudo journalctl -u $SERVICE_NAME -f   # Ver logs en vivo"
echo
