#!/usr/bin/env python3
"""
Test de conexion al panel ZK C3-400

Uso:
  python3 test_connection.py miguel.ddns.accessbot.net 4370
  python3 test_connection.py 192.168.1.201 4370

Prueba:
  1. Resolucion DNS
  2. Conectividad TCP al puerto
  3. Handshake protocolo ZK
  4. Obtener numero de serie
  5. Leer eventos en tiempo real (10 segundos)
"""

import sys
import socket
import struct
import time
from datetime import datetime


# --- Protocolo ZK ---

ZK_CMD_CONNECT = 1000
ZK_CMD_EXIT = 1001
ZK_CMD_GET_SERIAL = 1534
ZK_CMD_GET_RT_LOG = 501
ZK_CMD_ACK_OK = 2000
ZK_MAGIC = 0x5050

reply_id = 0
session_id = 0


def checksum(data: bytes) -> int:
    chksum = 0
    for i in range(0, len(data), 2):
        if i + 1 < len(data):
            chksum += struct.unpack('<H', data[i:i + 2])[0]
        else:
            chksum += data[i]
    chksum = chksum % 65536
    chksum = 65536 - chksum
    return chksum & 0xFFFF


def build_packet(command: int, data: bytes = b'') -> bytes:
    global reply_id, session_id
    reply_id += 1
    buf = struct.pack('<HHHH', command, 0, session_id, reply_id) + data
    chk = checksum(buf)
    buf = struct.pack('<HHHH', command, chk, session_id, reply_id) + data
    header = struct.pack('<HH', ZK_MAGIC, len(buf))
    return header + buf


def recv_packet(sock, timeout=5) -> bytes | None:
    sock.settimeout(timeout)
    try:
        header = b''
        while len(header) < 4:
            chunk = sock.recv(4 - len(header))
            if not chunk:
                return None
            header += chunk

        magic, length = struct.unpack('<HH', header)
        if magic != ZK_MAGIC:
            print(f"  [!] Magic inesperado: 0x{magic:04x} (esperado 0x5050)")
            # Leer el resto y mostrar hex dump
            rest = sock.recv(4096)
            print(f"  [!] Datos raw: {(header + rest).hex()}")
            return None

        data = b''
        while len(data) < length:
            chunk = sock.recv(length - len(data))
            if not chunk:
                return None
            data += chunk
        return data
    except socket.timeout:
        return None


def get_cmd(data: bytes) -> int:
    if len(data) >= 2:
        return struct.unpack('<H', data[0:2])[0]
    return 0


# --- Tests ---

def test_dns(host):
    print(f"\n[1/5] Resolucion DNS: {host}")
    try:
        ip = socket.gethostbyname(host)
        print(f"  OK -> {ip}")
        return ip
    except socket.gaierror as e:
        print(f"  FALLO -> {e}")
        return None


def test_tcp(ip, port, timeout=5):
    print(f"\n[2/5] Conectividad TCP: {ip}:{port}")
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(timeout)
    try:
        t0 = time.time()
        sock.connect((ip, port))
        latency = (time.time() - t0) * 1000
        print(f"  OK -> Conectado en {latency:.0f}ms")
        return sock
    except socket.timeout:
        print(f"  FALLO -> Timeout ({timeout}s) - puerto cerrado o filtrado")
        return None
    except ConnectionRefusedError:
        print(f"  FALLO -> Conexion rechazada - puerto cerrado")
        return None
    except OSError as e:
        print(f"  FALLO -> {e}")
        return None


def test_handshake(sock):
    global session_id
    print(f"\n[3/5] Handshake protocolo ZK")
    try:
        cmd = build_packet(ZK_CMD_CONNECT)
        print(f"  Enviando CONNECT ({len(cmd)} bytes)...")
        sock.send(cmd)

        response = recv_packet(sock, timeout=5)
        if response is None:
            print(f"  FALLO -> Sin respuesta del panel")
            print(f"  NOTA: El dispositivo respondio TCP pero no habla protocolo ZK")
            print(f"        Verificar que es un C3-400 y el puerto es correcto")
            return False

        cmd_resp = get_cmd(response)
        if cmd_resp == ZK_CMD_ACK_OK:
            session_id = struct.unpack('<H', response[4:6])[0]
            print(f"  OK -> Handshake exitoso (session_id={session_id})")
            return True
        else:
            print(f"  FALLO -> Respuesta inesperada: cmd={cmd_resp}")
            print(f"  Raw: {response.hex()}")
            return False
    except Exception as e:
        print(f"  FALLO -> {e}")
        return False


def test_serial(sock):
    print(f"\n[4/5] Numero de serie del panel")
    try:
        cmd = build_packet(ZK_CMD_GET_SERIAL)
        sock.send(cmd)
        response = recv_packet(sock, timeout=3)
        if response and len(response) > 8:
            serial = response[8:].decode('ascii', errors='ignore').strip('\x00')
            print(f"  OK -> S/N: {serial}")
            return serial
        else:
            print(f"  WARN -> No se pudo obtener serial (puede requerir otro comando)")
            return ""
    except Exception as e:
        print(f"  WARN -> {e}")
        return ""


def test_realtime_events(sock, duration=10):
    print(f"\n[5/5] Escuchando eventos en tiempo real ({duration}s)...")
    print(f"  (Pasa una tarjeta por el lector para generar un evento)")
    print()

    start = time.time()
    event_count = 0

    try:
        # Solicitar monitoreo de eventos
        cmd = build_packet(ZK_CMD_GET_RT_LOG)
        sock.send(cmd)

        while time.time() - start < duration:
            remaining = duration - (time.time() - start)
            if remaining <= 0:
                break

            response = recv_packet(sock, timeout=min(2, remaining))
            if response and len(response) > 8:
                resp_cmd = get_cmd(response)
                data = response[8:]

                if len(data) >= 14:
                    # Intentar parsear como evento
                    card_no = struct.unpack('<I', data[0:4])[0]
                    door_id = data[4] if len(data) > 4 else 0
                    entry_exit = data[5] if len(data) > 5 else 0
                    event_type = data[6] if len(data) > 6 else 0
                    verify_mode = data[7] if len(data) > 7 else 0

                    if card_no > 0 or event_type > 0:
                        event_count += 1
                        direction = "SALIDA" if entry_exit == 1 else "ENTRADA"
                        print(f"  EVENTO #{event_count}: Tarjeta={card_no} "
                              f"Puerta={door_id} {direction} "
                              f"Tipo={event_type} Verificacion={verify_mode}")
                    else:
                        elapsed = time.time() - start
                        print(f"  [{elapsed:.0f}s] Respuesta cmd={resp_cmd} "
                              f"({len(data)} bytes datos)", end='\r')
                else:
                    elapsed = time.time() - start
                    print(f"  [{elapsed:.0f}s] Esperando eventos...", end='\r')

            else:
                elapsed = time.time() - start
                print(f"  [{elapsed:.0f}s] Sin eventos nuevos...", end='\r')

    except KeyboardInterrupt:
        print(f"\n  Interrumpido por usuario")
    except Exception as e:
        print(f"\n  Error: {e}")

    print(f"\n  Total eventos recibidos: {event_count}")
    return event_count


def disconnect(sock):
    try:
        cmd = build_packet(ZK_CMD_EXIT)
        sock.send(cmd)
        sock.close()
    except Exception:
        pass


def main():
    if len(sys.argv) < 2:
        print("Uso: python3 test_connection.py <host> [puerto]")
        print()
        print("Ejemplos:")
        print("  python3 test_connection.py miguel.ddns.accessbot.net")
        print("  python3 test_connection.py miguel.ddns.accessbot.net 4370")
        print("  python3 test_connection.py 192.168.1.201 4370")
        sys.exit(1)

    host = sys.argv[1]
    port = int(sys.argv[2]) if len(sys.argv) > 2 else 4370

    print("=" * 60)
    print(f"  ZK C3-400 Connection Test")
    print(f"  Host:   {host}")
    print(f"  Puerto: {port}")
    print(f"  Fecha:  {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)

    # Test 1: DNS
    ip = test_dns(host)
    if ip is None:
        print("\n[RESULTADO] FALLO en DNS - no se puede resolver el host")
        sys.exit(1)

    # Test 2: TCP
    sock = test_tcp(ip, port)
    if sock is None:
        print(f"\n[RESULTADO] FALLO en TCP - no se puede conectar a {ip}:{port}")
        print(f"  Verificar:")
        print(f"    - Port forwarding en el router del cliente (puerto {port})")
        print(f"    - Firewall del panel C3-400")
        print(f"    - Que el DDNS este apuntando al IP correcto")
        sys.exit(1)

    # Test 3: Handshake ZK
    if not test_handshake(sock):
        print(f"\n[RESULTADO] TCP conecta pero el handshake ZK fallo")
        print(f"  Verificar:")
        print(f"    - Que el puerto {port} corresponde al C3-400 (default 4370)")
        print(f"    - Que no hay otro servicio en ese puerto")
        sock.close()
        sys.exit(1)

    # Test 4: Serial
    serial = test_serial(sock)

    # Test 5: Eventos en tiempo real
    print(f"\n  Presiona Ctrl+C para terminar antes de los 10 segundos")
    test_realtime_events(sock, duration=10)

    # Disconnect
    disconnect(sock)

    print("\n" + "=" * 60)
    print(f"  [RESULTADO] CONEXION EXITOSA")
    print(f"  Panel: {host} ({ip}:{port})")
    if serial:
        print(f"  Serial: {serial}")
    print(f"  Protocolo ZK: OK")
    print(f"  Listo para integrar con MQTT bridge")
    print("=" * 60)


if __name__ == '__main__':
    main()
