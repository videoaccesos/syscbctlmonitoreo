#!/usr/bin/env python3
"""
ZK C3-400 MQTT Bridge

Puente entre panel de control de acceso ZKTeco C3-400 y broker MQTT.
Lee eventos del panel en tiempo real y los publica al broker.
Tambien recibe comandos MQTT para abrir puertas remotamente.

Uso:
  python3 bridge.py                     # Usa config.yaml por defecto
  python3 bridge.py -c mi_config.yaml   # Config personalizado
  python3 bridge.py --test              # Solo probar conexiones
"""

import argparse
import logging
import logging.handlers
import os
import signal
import sys
import time
from datetime import datetime
from pathlib import Path

import yaml

from zk_c3 import ZKC3Panel, ZKEvent
from mqtt_publisher import MQTTPublisher

# Directorio del script
SCRIPT_DIR = Path(__file__).parent
DEFAULT_CONFIG = SCRIPT_DIR / 'config.yaml'

running = True


def signal_handler(sig, frame):
    global running
    logging.info("Senal de terminacion recibida, cerrando...")
    running = False


def setup_logging(config: dict):
    log_config = config.get('logging', {})
    level = getattr(logging, log_config.get('level', 'INFO').upper(), logging.INFO)
    log_file = log_config.get('file', 'zk_bridge.log')
    max_bytes = log_config.get('max_size_mb', 10) * 1024 * 1024
    backup_count = log_config.get('backup_count', 5)

    # Log file path relativo al directorio del script
    if not os.path.isabs(log_file):
        log_file = SCRIPT_DIR / log_file

    formatter = logging.Formatter(
        '%(asctime)s [%(levelname)s] %(name)s: %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )

    # Console handler
    console = logging.StreamHandler()
    console.setFormatter(formatter)
    console.setLevel(level)

    # File handler con rotacion
    file_handler = logging.handlers.RotatingFileHandler(
        log_file, maxBytes=max_bytes, backupCount=backup_count,
        encoding='utf-8'
    )
    file_handler.setFormatter(formatter)
    file_handler.setLevel(level)

    root = logging.getLogger()
    root.setLevel(level)
    root.addHandler(console)
    root.addHandler(file_handler)


def load_config(config_path: str) -> dict:
    path = Path(config_path)
    if not path.exists():
        print(f"Error: archivo de configuracion no encontrado: {config_path}")
        sys.exit(1)

    with open(path, 'r', encoding='utf-8') as f:
        return yaml.safe_load(f)


def test_connections(config: dict) -> bool:
    """Prueba conectividad al panel y al broker."""
    logger = logging.getLogger('test')
    ok = True

    # Test panel ZK
    zk_conf = config['zk_panel']
    logger.info(f"Probando panel ZK: {zk_conf['ip']}:{zk_conf['port']}")
    panel = ZKC3Panel(zk_conf['ip'], zk_conf['port'], zk_conf.get('timeout', 5))
    if panel.connect():
        serial = panel.get_serial()
        logger.info(f"Panel ZK OK (serial: {serial})")
        panel.disconnect()
    else:
        logger.error("No se pudo conectar al panel ZK")
        ok = False

    # Test MQTT
    mqtt_conf = config['mqtt']
    logger.info(f"Probando MQTT: {mqtt_conf['broker']}:{mqtt_conf['port']}")
    pub = MQTTPublisher(
        broker=mqtt_conf['broker'],
        port=mqtt_conf['port'],
        username=mqtt_conf.get('username', ''),
        password=mqtt_conf.get('password', ''),
        use_tls=mqtt_conf.get('use_tls', False),
        site_id=config.get('site_id', 'test'),
        topic_prefix=mqtt_conf.get('topic_prefix', 'videoaccesos'),
    )
    if pub.connect():
        logger.info("MQTT OK")
        pub.disconnect()
    else:
        logger.error("No se pudo conectar al broker MQTT")
        ok = False

    return ok


def run_bridge(config: dict):
    """Loop principal del bridge."""
    global running
    logger = logging.getLogger('bridge')

    site_id = config.get('site_id', 'default')
    zk_conf = config['zk_panel']
    mqtt_conf = config['mqtt']
    doors = {d['id']: d['name'] for d in config.get('doors', [])}

    poll_interval = zk_conf.get('poll_interval', 2)
    sync_interval = zk_conf.get('sync_interval', 300)

    # Crear instancias
    panel = ZKC3Panel(zk_conf['ip'], zk_conf['port'], zk_conf.get('timeout', 5))
    publisher = MQTTPublisher(
        broker=mqtt_conf['broker'],
        port=mqtt_conf['port'],
        username=mqtt_conf.get('username', ''),
        password=mqtt_conf.get('password', ''),
        use_tls=mqtt_conf.get('use_tls', False),
        qos=mqtt_conf.get('qos', 1),
        keepalive=mqtt_conf.get('keepalive', 60),
        topic_prefix=mqtt_conf.get('topic_prefix', 'videoaccesos'),
        site_id=site_id,
    )

    # --- Funciones de sync de tablas ---
    def sync_users():
        """Lee tabla de usuarios del panel y publica por MQTT."""
        if not panel.connected:
            logger.warning("Panel no conectado, no se puede sincronizar usuarios")
            return False
        try:
            logger.info("Sincronizando usuarios del panel...")
            users = panel.get_users()
            publisher.publish_data('users', users)
            return True
        except Exception as e:
            logger.error(f"Error sincronizando usuarios: {e}")
            return False

    def sync_transactions():
        """Lee transacciones del panel y publica por MQTT."""
        if not panel.connected:
            logger.warning("Panel no conectado, no se puede sincronizar transacciones")
            return False
        try:
            logger.info("Sincronizando transacciones del panel...")
            transactions = panel.get_transactions()
            publisher.publish_data('transactions', transactions)
            return True
        except Exception as e:
            logger.error(f"Error sincronizando transacciones: {e}")
            return False

    def sync_table(table_name: str):
        """Lee una tabla arbitraria del panel y publica por MQTT."""
        if not panel.connected:
            logger.warning(f"Panel no conectado, no se puede sincronizar {table_name}")
            return False
        try:
            logger.info(f"Sincronizando tabla '{table_name}' del panel...")
            records = panel.get_table(table_name)
            publisher.publish_data(table_name, records)
            return True
        except Exception as e:
            logger.error(f"Error sincronizando tabla {table_name}: {e}")
            return False

    # Callback para comandos remotos (abrir puerta, sync, etc.)
    def on_command(topic: str, payload: dict):
        cmd = payload.get('command', '')
        if cmd == 'open_door':
            door_id = payload.get('door_id', 1)
            duration = payload.get('duration', 5)
            logger.info(f"Comando remoto: abrir puerta {door_id} por {duration}s")
            if panel.connected:
                success = panel.open_door(door_id, duration)
                publisher.publish_event({
                    'type': 'command_result',
                    'command': 'open_door',
                    'door_id': door_id,
                    'door_name': doors.get(door_id, f"Puerta {door_id}"),
                    'success': success,
                })
            else:
                logger.warning("Panel no conectado, no se puede abrir puerta")

        elif cmd == 'sync_users':
            logger.info("Comando remoto: sync usuarios")
            sync_users()

        elif cmd == 'sync_transactions':
            logger.info("Comando remoto: sync transacciones")
            sync_transactions()

        elif cmd == 'sync_table':
            table_name = payload.get('table', '')
            if table_name:
                logger.info(f"Comando remoto: sync tabla '{table_name}'")
                sync_table(table_name)
            else:
                logger.warning("Comando sync_table sin nombre de tabla")

        elif cmd == 'sync_all':
            logger.info("Comando remoto: sync completo")
            sync_users()
            sync_transactions()

        else:
            logger.warning(f"Comando desconocido: {cmd}")

    publisher.on_command = on_command

    # Conectar MQTT primero (siempre debe estar conectado)
    logger.info("Conectando al broker MQTT...")
    if not publisher.connect():
        logger.error("No se pudo conectar a MQTT. Reintentando en 30s...")
        time.sleep(30)
        if not publisher.connect():
            logger.error("MQTT no disponible. Abortando.")
            return

    # Conectar al panel
    logger.info(f"Conectando al panel ZK: {zk_conf['ip']}:{zk_conf['port']}")
    panel_connected = panel.connect()
    if panel_connected:
        serial = panel.get_serial()
        logger.info(f"Panel conectado (S/N: {serial})")
        publisher.publish_heartbeat(True, {'serial': serial})
    else:
        logger.warning("Panel no disponible - seguira intentando...")
        publisher.publish_heartbeat(False)

    # Contadores
    last_heartbeat = time.time()
    last_sync = time.time()
    reconnect_delay = 5
    events_total = 0

    # Sync inicial de tablas al arrancar
    if panel_connected:
        logger.info("Ejecutando sync inicial de tablas...")
        sync_users()
        sync_transactions()

    logger.info(f"Bridge activo - Site: {site_id} | Poll: {poll_interval}s | Sync: {sync_interval}s")
    logger.info("Presiona Ctrl+C para detener")

    while running:
        try:
            # Reconectar panel si es necesario
            if not panel.connected:
                logger.info(f"Reconectando panel en {reconnect_delay}s...")
                time.sleep(reconnect_delay)
                panel_connected = panel.connect()
                if panel_connected:
                    reconnect_delay = 5
                    logger.info("Panel reconectado")
                    publisher.publish_heartbeat(True)
                else:
                    reconnect_delay = min(reconnect_delay * 2, 120)
                    publisher.publish_heartbeat(False)
                    continue

            # Reconectar MQTT si es necesario
            if not publisher.connected:
                logger.warning("MQTT desconectado, esperando reconexion automatica...")
                time.sleep(5)
                continue

            # Leer eventos del panel
            events = panel.get_events()
            for event in events:
                events_total += 1
                door_name = doors.get(event.door_id, f"Puerta {event.door_id}")

                logger.info(
                    f"Evento #{events_total}: {event.event_name} | "
                    f"Tarjeta: {event.card_no} | {door_name} | "
                    f"{event.direction} | {event.timestamp}"
                )

                publisher.publish_event({
                    **event.to_dict(),
                    'door_name': door_name,
                    'event_number': events_total,
                })

            # Sync periodico de tablas (cada sync_interval segundos)
            now = time.time()
            if now - last_sync >= sync_interval:
                logger.info(f"Sync periodico de tablas (cada {sync_interval}s)")
                sync_users()
                sync_transactions()
                last_sync = now

            # Heartbeat periodico (cada 60s)
            if now - last_heartbeat >= 60:
                publisher.publish_heartbeat(
                    panel.connected,
                    {'events_total': events_total}
                )
                last_heartbeat = now

            # Esperar antes del siguiente poll
            time.sleep(poll_interval)

        except KeyboardInterrupt:
            running = False
        except Exception as e:
            logger.error(f"Error en loop principal: {e}", exc_info=True)
            time.sleep(5)

    # Cleanup
    logger.info("Cerrando bridge...")
    panel.disconnect()
    publisher.disconnect()
    logger.info(f"Bridge detenido. Total eventos procesados: {events_total}")


def main():
    parser = argparse.ArgumentParser(description='ZK C3-400 MQTT Bridge')
    parser.add_argument('-c', '--config', default=str(DEFAULT_CONFIG),
                        help='Ruta al archivo de configuracion YAML')
    parser.add_argument('--test', action='store_true',
                        help='Solo probar conexiones y salir')
    args = parser.parse_args()

    config = load_config(args.config)
    setup_logging(config)

    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    logger = logging.getLogger('main')
    logger.info("=" * 50)
    logger.info(f"ZK C3-400 MQTT Bridge v1.0")
    logger.info(f"Site: {config.get('site_id', 'default')}")
    logger.info(f"Panel: {config['zk_panel']['ip']}:{config['zk_panel']['port']}")
    logger.info(f"MQTT:  {config['mqtt']['broker']}:{config['mqtt']['port']}")
    logger.info("=" * 50)

    if args.test:
        ok = test_connections(config)
        sys.exit(0 if ok else 1)

    run_bridge(config)


if __name__ == '__main__':
    main()
