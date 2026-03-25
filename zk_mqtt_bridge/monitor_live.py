#!/usr/bin/env python3
"""
Monitor continuo de eventos del panel ZK C3-400

Lee tarjetazos y eventos en tiempo real y los muestra en consola.
Opcionalmente publica a MQTT.

Uso:
  python3 monitor_live.py <host>
  python3 monitor_live.py <host> --mqtt
  python3 monitor_live.py <host> --interval 1
  python3 monitor_live.py <host> --log eventos.log

Ejemplos:
  python3 monitor_live.py 192.168.1.201
  python3 monitor_live.py miguel.ddns.accessbot.net --mqtt
"""

import sys
import time
import signal
import logging
from datetime import datetime

# Estado global para shutdown limpio
running = True
panel = None
stats = {"events": 0, "polls": 0, "errors": 0, "reconnects": 0}


def signal_handler(sig, frame):
    global running
    running = False
    print("\n\n  Deteniendo monitor...")


signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)


def setup_logging(log_file=None):
    fmt = "%(asctime)s %(message)s"
    datefmt = "%H:%M:%S"
    handlers = [logging.StreamHandler()]
    if log_file:
        handlers.append(logging.FileHandler(log_file, encoding="utf-8"))
    logging.basicConfig(level=logging.INFO, format=fmt, datefmt=datefmt,
                        handlers=handlers)


def connect_panel(host, port=4370, timeout=5):
    """Conectar al panel usando zkaccess-c3."""
    try:
        from c3 import C3
    except ImportError:
        print("ERROR: libreria zkaccess-c3 no instalada")
        print("  pip3 install zkaccess-c3")
        sys.exit(1)

    p = C3(host)
    p.connect()
    return p


def format_event(ev, event_num):
    """Formatea un evento para mostrar en consola."""
    # Extraer campos del evento de la libreria c3
    card = getattr(ev, "card_no", getattr(ev, "card", "?"))
    door = getattr(ev, "door", getattr(ev, "door_id", "?"))
    event_type = getattr(ev, "event_type", -1)
    verify = getattr(ev, "verified", getattr(ev, "verify_mode", "?"))
    entry_exit = getattr(ev, "entry_exit",
                         getattr(ev, "in_out_state", "?"))
    ts = getattr(ev, "time_second", getattr(ev, "timestamp", ""))

    # Nombres legibles
    from zk_c3 import EVENT_TYPES, VERIFY_MODES
    event_name = EVENT_TYPES.get(event_type, f"tipo_{event_type}")
    verify_name = VERIFY_MODES.get(verify, f"modo_{verify}")

    direction = "ENTRADA" if entry_exit == 0 else "SALIDA" if entry_exit == 1 else f"dir_{entry_exit}"

    # Formato compacto pero informativo
    now = datetime.now().strftime("%H:%M:%S")
    lines = [
        f"  [{now}] EVENTO #{event_num}",
        f"    Tarjeta:   {card}",
        f"    Puerta:    {door}",
        f"    Tipo:      {event_name} ({event_type})",
        f"    Direccion: {direction}",
        f"    Verif:     {verify_name}",
        f"    Hora panel:{ts}",
    ]
    return "\n".join(lines)


def monitor_loop(host, interval=2, mqtt_config=None):
    """Bucle principal de monitoreo."""
    global panel, running

    logger = logging.getLogger("monitor")
    mqtt_pub = None

    # Conectar MQTT si se solicita
    if mqtt_config:
        try:
            from mqtt_publisher import MQTTPublisher
            mqtt_pub = MQTTPublisher(
                broker=mqtt_config.get("broker", "accesoswhatsapp.info"),
                port=mqtt_config.get("port", 1883),
                topic_prefix=mqtt_config.get("topic_prefix", "videoaccesos"),
                site_id=mqtt_config.get("site_id", "interlomas"),
            )
            mqtt_pub.connect()
            print(f"  MQTT conectado: {mqtt_config.get('broker')}")
        except Exception as e:
            print(f"  MQTT error (continuando sin MQTT): {e}")
            mqtt_pub = None

    # Conectar al panel
    print(f"\n  Conectando a {host}:4370...")
    try:
        panel = connect_panel(host)
        print(f"  Conectado al panel")
    except Exception as e:
        print(f"  ERROR conectando: {e}")
        sys.exit(1)

    # Obtener serial
    try:
        params = panel.get_device_param(["~SerialNumber"])
        serial = params.get("~SerialNumber", "?") if isinstance(params, dict) else str(params)
        print(f"  Serial: {serial}")
    except Exception:
        serial = "?"

    print()
    print("=" * 60)
    print(f"  MONITOR EN VIVO - {host}")
    print(f"  Serial: {serial}")
    print(f"  Intervalo: {interval}s")
    print(f"  MQTT: {'SI' if mqtt_pub else 'NO'}")
    print(f"  Hora inicio: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"  Ctrl+C para detener")
    print("=" * 60)
    print()

    backoff = 5
    last_status = time.time()

    while running:
        try:
            events = panel.get_rt_log()
            stats["polls"] += 1

            if events:
                for ev in events:
                    event_type = getattr(ev, "event_type", None)

                    # Heartbeat del panel (tipo 255) - mostrar discretamente
                    if event_type == 255:
                        continue

                    stats["events"] += 1
                    print(format_event(ev, stats["events"]))
                    print()

                    # Publicar a MQTT si esta conectado
                    if mqtt_pub:
                        try:
                            from zk_c3 import EVENT_TYPES, VERIFY_MODES
                            card = getattr(ev, "card_no",
                                           getattr(ev, "card", ""))
                            door = getattr(ev, "door",
                                           getattr(ev, "door_id", 0))
                            mqtt_pub.publish_event({
                                "card_no": str(card),
                                "door_id": door,
                                "event_type": event_type,
                                "event_name": EVENT_TYPES.get(event_type, ""),
                                "entry_exit": getattr(ev, "entry_exit",
                                                      getattr(ev, "in_out_state", 0)),
                                "verify_mode": getattr(ev, "verified",
                                                       getattr(ev, "verify_mode", 0)),
                                "timestamp": str(getattr(ev, "time_second",
                                                         datetime.now())),
                            })
                        except Exception as e:
                            logger.warning(f"MQTT publish error: {e}")

            # Linea de estado cada 30 segundos
            now = time.time()
            if now - last_status >= 30:
                elapsed = now - last_status
                last_status = now
                ts = datetime.now().strftime("%H:%M:%S")
                print(f"  [{ts}] --- polls:{stats['polls']} "
                      f"eventos:{stats['events']} "
                      f"errores:{stats['errors']} "
                      f"reconex:{stats['reconnects']} ---")

            backoff = 5  # Reset backoff on success
            time.sleep(interval)

        except (ConnectionError, OSError, BrokenPipeError) as e:
            stats["errors"] += 1
            logger.warning(f"Conexion perdida: {e}")
            print(f"\n  Reconectando en {backoff}s...")

            # Intentar reconectar
            time.sleep(backoff)
            backoff = min(backoff * 2, 120)

            try:
                panel = connect_panel(host)
                stats["reconnects"] += 1
                print(f"  Reconectado OK")
            except Exception as re:
                logger.warning(f"Reconexion fallida: {re}")

        except Exception as e:
            stats["errors"] += 1
            logger.error(f"Error inesperado: {e}")
            time.sleep(interval)

    # Shutdown limpio
    print()
    print("=" * 60)
    print(f"  MONITOR DETENIDO")
    print(f"  Duracion: desde inicio")
    print(f"  Polls totales: {stats['polls']}")
    print(f"  Eventos capturados: {stats['events']}")
    print(f"  Errores: {stats['errors']}")
    print(f"  Reconexiones: {stats['reconnects']}")
    print("=" * 60)

    try:
        panel.disconnect()
    except Exception:
        pass

    if mqtt_pub:
        try:
            mqtt_pub.disconnect()
        except Exception:
            pass


def main():
    import argparse

    parser = argparse.ArgumentParser(
        description="Monitor en vivo de eventos ZK C3-400")
    parser.add_argument("host",
                        help="IP o hostname del panel (ej: 192.168.1.201)")
    parser.add_argument("--interval", "-i", type=float, default=2,
                        help="Intervalo de polling en segundos (default: 2)")
    parser.add_argument("--mqtt", action="store_true",
                        help="Publicar eventos a MQTT")
    parser.add_argument("--broker", default="accesoswhatsapp.info",
                        help="Broker MQTT (default: accesoswhatsapp.info)")
    parser.add_argument("--site-id", default="interlomas",
                        help="Site ID para MQTT (default: interlomas)")
    parser.add_argument("--log", default=None,
                        help="Archivo de log (ej: eventos.log)")

    args = parser.parse_args()
    setup_logging(args.log)

    mqtt_config = None
    if args.mqtt:
        mqtt_config = {
            "broker": args.broker,
            "port": 1883,
            "topic_prefix": "videoaccesos",
            "site_id": args.site_id,
        }

    monitor_loop(args.host, interval=args.interval, mqtt_config=mqtt_config)


if __name__ == "__main__":
    main()
