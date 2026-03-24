#!/usr/bin/env python3
"""
Test de conexion al panel ZK C3-400

Usa la libreria zkaccess-c3 (pip install zkaccess-c3, modulo 'c3').

Uso:
  python3 test_connection.py miguel.ddns.accessbot.net
  python3 test_connection.py 192.168.1.201
"""

import sys
import socket
import time
from datetime import datetime


def test_dns(host):
    print(f"\n[1/5] Resolucion DNS: {host}")
    try:
        ip = socket.gethostbyname(host)
        print(f"  OK -> {ip}")
        return ip
    except socket.gaierror as e:
        print(f"  FALLO -> {e}")
        return None


def test_tcp(ip, port=4370, timeout=5):
    print(f"\n[2/5] Conectividad TCP: {ip}:{port}")
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(timeout)
    try:
        t0 = time.time()
        sock.connect((ip, port))
        latency = (time.time() - t0) * 1000
        print(f"  OK -> Conectado en {latency:.0f}ms")
        sock.close()
        return True
    except socket.timeout:
        print(f"  FALLO -> Timeout ({timeout}s) - puerto cerrado o filtrado")
        return False
    except ConnectionRefusedError:
        print(f"  FALLO -> Conexion rechazada - puerto cerrado")
        return False
    except OSError as e:
        print(f"  FALLO -> {e}")
        return False


def test_handshake(host):
    print(f"\n[3/5] Handshake protocolo ZK (libreria c3)")
    try:
        from c3 import C3
    except ImportError:
        print(f"  FALLO -> Libreria no instalada")
        print(f"  Instalar: pip3 install zkaccess-c3")
        return None

    try:
        panel = C3(host)
        panel.connect()
        print(f"  OK -> Handshake exitoso")
        return panel
    except Exception as e:
        print(f"  FALLO -> {e}")
        return None


def test_serial(panel):
    print(f"\n[4/5] Numero de serie del panel")
    try:
        params = panel.get_device_param(['~SerialNumber'])
        serial = ""
        if isinstance(params, dict):
            serial = str(params.get('~SerialNumber', ''))
        else:
            serial = str(params)
        print(f"  OK -> S/N: {serial}")
        return serial
    except Exception as e:
        print(f"  WARN -> {e}")
        return ""


def test_realtime_events(panel, duration=10):
    print(f"\n[5/5] Escuchando eventos en tiempo real ({duration}s)...")
    print(f"  (Pasa una tarjeta por el lector para generar un evento)")
    print()

    start = time.time()
    event_count = 0
    poll_count = 0

    try:
        while time.time() - start < duration:
            try:
                events = panel.get_rt_log()
                poll_count += 1
                if events:
                    for ev in events:
                        event_type = getattr(ev, 'event_type', None)
                        # event_type 255 = status heartbeat, skip
                        if event_type == 255:
                            elapsed = time.time() - start
                            print(f"  [{elapsed:.0f}s] Status heartbeat "
                                  f"(puertas OK)", end='\r')
                            continue
                        event_count += 1
                        card = getattr(ev, 'card_no',
                                       getattr(ev, 'card', '?'))
                        door = getattr(ev, 'door',
                                       getattr(ev, 'door_id', '?'))
                        ts = getattr(ev, 'time_second',
                                     getattr(ev, 'timestamp', ''))
                        print(f"  EVENTO #{event_count}: Tarjeta={card} "
                              f"Puerta={door} Tipo={event_type} "
                              f"Hora={ts}")
                else:
                    elapsed = time.time() - start
                    print(f"  [{elapsed:.0f}s] Esperando eventos... "
                          f"(polls: {poll_count})", end='\r')
            except Exception as e:
                print(f"\n  Error poll: {e}")
            time.sleep(2)

    except KeyboardInterrupt:
        print(f"\n  Interrumpido por usuario")

    print(f"\n  Total eventos recibidos: {event_count} "
          f"(en {poll_count} polls)")
    return event_count


def main():
    if len(sys.argv) < 2:
        print("Uso: python3 test_connection.py <host>")
        print()
        print("Ejemplos:")
        print("  python3 test_connection.py miguel.ddns.accessbot.net")
        print("  python3 test_connection.py 192.168.1.201")
        sys.exit(1)

    host = sys.argv[1]

    print("=" * 60)
    print(f"  ZK C3-400 Connection Test")
    print(f"  Host:   {host}")
    print(f"  Puerto: 4370 (hardcoded por libreria c3)")
    print(f"  Fecha:  {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)

    # Test 1: DNS
    ip = test_dns(host)
    if ip is None:
        print("\n[RESULTADO] FALLO en DNS")
        sys.exit(1)

    # Test 2: TCP
    if not test_tcp(ip):
        print(f"\n[RESULTADO] FALLO en TCP")
        print(f"  Verificar port forwarding del puerto 4370")
        sys.exit(1)

    # Test 3: Handshake
    panel = test_handshake(host)
    if panel is None:
        print(f"\n[RESULTADO] TCP conecta pero handshake fallo")
        sys.exit(1)

    # Test 4: Serial
    serial = test_serial(panel)

    # Test 5: Eventos
    print(f"\n  Presiona Ctrl+C para terminar antes de {10}s")
    test_realtime_events(panel, duration=10)

    # Disconnect
    try:
        panel.disconnect()
    except Exception:
        pass

    print("\n" + "=" * 60)
    print(f"  [RESULTADO] CONEXION EXITOSA")
    print(f"  Panel: {host} ({ip}:4370)")
    if serial:
        print(f"  Serial: {serial}")
    print(f"  Protocolo: zkaccess-c3 (libreria c3)")
    print(f"  Listo para integrar con MQTT bridge")
    print("=" * 60)


if __name__ == '__main__':
    main()
