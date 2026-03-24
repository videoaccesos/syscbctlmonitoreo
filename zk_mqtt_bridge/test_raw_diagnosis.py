#!/usr/bin/env python3
"""
Diagnostico raw del panel C3-400.

Envia diferentes handshakes y captura la respuesta raw,
sin asumir un protocolo especifico.

Uso:
  python3 test_raw_diagnosis.py miguel.ddns.accessbot.net 4370
"""

import sys
import socket
import struct
import time
from datetime import datetime


def hex_dump(data: bytes, prefix: str = "  ") -> str:
    """Muestra datos en formato hex dump legible."""
    lines = []
    for i in range(0, len(data), 16):
        chunk = data[i:i + 16]
        hex_part = ' '.join(f'{b:02x}' for b in chunk)
        ascii_part = ''.join(chr(b) if 32 <= b < 127 else '.' for b in chunk)
        lines.append(f"{prefix}{i:04x}: {hex_part:<48s} {ascii_part}")
    return '\n'.join(lines)


def try_recv(sock, timeout=3) -> bytes:
    """Intenta recibir datos con timeout."""
    sock.settimeout(timeout)
    try:
        data = sock.recv(4096)
        return data
    except socket.timeout:
        return b''
    except Exception as e:
        print(f"  Error recv: {e}")
        return b''


def test_passive_listen(ip, port):
    """Conecta y escucha sin enviar nada, por si el panel habla primero."""
    print("\n[TEST 1] Conexion pasiva - escuchar si el panel envia algo primero")
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(5)
    try:
        sock.connect((ip, port))
        print("  TCP conectado, esperando 3s por datos del panel...")
        data = try_recv(sock, timeout=3)
        if data:
            print(f"  RECIBIDO {len(data)} bytes:")
            print(hex_dump(data))
        else:
            print("  Sin datos - el panel espera que el cliente hable primero")
        sock.close()
        return data
    except Exception as e:
        print(f"  Error: {e}")
        return b''


def test_zk_connect(ip, port, comm_key=0):
    """Prueba handshake ZK estandar (0x5050) con comm key opcional."""
    key_str = f" (comm_key={comm_key})" if comm_key else ""
    print(f"\n[TEST 2] Handshake ZK 0x5050{key_str}")
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(5)
    try:
        sock.connect((ip, port))

        # Construir paquete CONNECT
        reply_id = 1
        session_id = 0
        command = 1000  # CMD_CONNECT

        if comm_key:
            data_payload = struct.pack('<I', comm_key)
        else:
            data_payload = b''

        buf = struct.pack('<HHHH', command, 0, session_id, reply_id) + data_payload
        # Calcular checksum
        chksum = 0
        for i in range(0, len(buf), 2):
            if i + 1 < len(buf):
                chksum += struct.unpack('<H', buf[i:i + 2])[0]
            else:
                chksum += buf[i]
        chksum = (65536 - (chksum % 65536)) & 0xFFFF
        buf = struct.pack('<HHHH', command, chksum, session_id, reply_id) + data_payload
        header = struct.pack('<HH', 0x5050, len(buf))
        packet = header + buf

        print(f"  Enviando ({len(packet)} bytes):")
        print(hex_dump(packet))
        sock.send(packet)

        # Esperar respuesta
        data = try_recv(sock, timeout=5)
        if data:
            print(f"  RESPUESTA ({len(data)} bytes):")
            print(hex_dump(data))

            # Intentar parsear como ZK
            if len(data) >= 4:
                magic = struct.unpack('<H', data[0:2])[0]
                if magic == 0x5050:
                    length = struct.unpack('<H', data[2:4])[0]
                    if len(data) >= 4 + 2:
                        cmd_resp = struct.unpack('<H', data[4:6])[0]
                        print(f"\n  Parsed: magic=0x{magic:04x}, len={length}, "
                              f"cmd={cmd_resp}")
                        if cmd_resp == 2000:
                            print("  >>> HANDSHAKE EXITOSO (ACK_OK=2000)")
                        elif cmd_resp == 2001:
                            print("  >>> HANDSHAKE FALLIDO (ACK_ERROR=2001)")
                            print("  >>> Puede requerir comm_key/password")
                        elif cmd_resp == 2002:
                            print("  >>> DATOS RECIBIDOS (ACK_DATA=2002)")
                        else:
                            print(f"  >>> Comando respuesta desconocido: {cmd_resp}")
                else:
                    print(f"\n  No es protocolo ZK (magic=0x{magic:04x}, "
                          f"esperado 0x5050)")
        else:
            print("  Sin respuesta (timeout 5s)")

        sock.close()
        return data
    except Exception as e:
        print(f"  Error: {e}")
        return b''


def test_zk_with_comm_keys(ip, port):
    """Prueba varios comm keys comunes."""
    print("\n[TEST 3] Probando comm keys comunes")
    common_keys = [0, 123456, 1, 111111, 888888, 999999, 12345678]

    for key in common_keys:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(3)
        try:
            sock.connect((ip, port))

            reply_id = 1
            session_id = 0
            command = 1000

            if key > 0:
                data_payload = struct.pack('<I', key)
            else:
                data_payload = b''

            buf = struct.pack('<HHHH', command, 0, session_id,
                              reply_id) + data_payload
            chksum = 0
            for i in range(0, len(buf), 2):
                if i + 1 < len(buf):
                    chksum += struct.unpack('<H', buf[i:i + 2])[0]
                else:
                    chksum += buf[i]
            chksum = (65536 - (chksum % 65536)) & 0xFFFF
            buf = struct.pack('<HHHH', command, chksum, session_id,
                              reply_id) + data_payload
            header = struct.pack('<HH', 0x5050, len(buf))
            sock.send(header + buf)

            data = try_recv(sock, timeout=3)
            if data:
                if len(data) >= 6:
                    magic = struct.unpack('<H', data[0:2])[0]
                    if magic == 0x5050:
                        cmd_resp = struct.unpack('<H', data[4:6])[0]
                        status = "OK" if cmd_resp == 2000 else f"cmd={cmd_resp}"
                        print(f"  Key {key:>10d}: RESPUESTA -> {status}")
                        if cmd_resp == 2000:
                            print(f"  >>> COMM KEY ENCONTRADO: {key}")
                            sock.close()
                            return key
                    else:
                        print(f"  Key {key:>10d}: respuesta no-ZK "
                              f"({len(data)} bytes)")
                else:
                    print(f"  Key {key:>10d}: respuesta parcial "
                          f"({len(data)} bytes)")
            else:
                print(f"  Key {key:>10d}: sin respuesta")

            sock.close()
        except Exception as e:
            print(f"  Key {key:>10d}: error -> {e}")
            try:
                sock.close()
            except Exception:
                pass
        time.sleep(0.3)  # Pausa entre intentos

    print("  Ningún comm key funcionó")
    return None


def test_pull_sdk_protocol(ip, port):
    """Prueba con protocolo PULL SDK (variante usada por paneles C3)."""
    print("\n[TEST 4] Variante PULL SDK (UDP-like sobre TCP)")
    print("  Nota: Algunos C3-400 usan UDP puerto 4370, no TCP")

    # Intentar UDP
    print(f"\n  Probando UDP {ip}:{port}...")
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.settimeout(3)
    try:
        # Enviar paquete CONNECT via UDP
        reply_id = 1
        session_id = 0
        command = 1000
        buf = struct.pack('<HHHH', command, 0, session_id, reply_id)
        chksum = 0
        for i in range(0, len(buf), 2):
            if i + 1 < len(buf):
                chksum += struct.unpack('<H', buf[i:i + 2])[0]
            else:
                chksum += buf[i]
        chksum = (65536 - (chksum % 65536)) & 0xFFFF
        buf = struct.pack('<HHHH', command, chksum, session_id, reply_id)
        header = struct.pack('<HH', 0x5050, len(buf))
        packet = header + buf

        sock.sendto(packet, (ip, port))
        print(f"  Enviado UDP ({len(packet)} bytes)")

        try:
            data, addr = sock.recvfrom(4096)
            if data:
                print(f"  RESPUESTA UDP de {addr} ({len(data)} bytes):")
                print(hex_dump(data))
                if len(data) >= 6:
                    magic = struct.unpack('<H', data[0:2])[0]
                    if magic == 0x5050:
                        cmd_resp = struct.unpack('<H', data[4:6])[0]
                        print(f"\n  >>> PANEL RESPONDE POR UDP! cmd={cmd_resp}")
                        if cmd_resp == 2000:
                            print("  >>> HANDSHAKE UDP EXITOSO!")
            else:
                print("  Sin datos UDP")
        except socket.timeout:
            print("  Sin respuesta UDP (timeout 3s)")

        sock.close()
    except Exception as e:
        print(f"  Error UDP: {e}")


def test_zkaccess_c3_lib(ip, port):
    """Intenta usar la libreria zkaccess-c3 directamente."""
    print("\n[TEST 5] Libreria zkaccess-c3 (pip)")
    try:
        import zkaccess_c3
        print(f"  zkaccess-c3 version: {getattr(zkaccess_c3, '__version__', '?')}")
        C3 = zkaccess_c3.C3
        panel = C3(ip, port)
        print(f"  Conectando a {ip}:{port}...")
        panel.connect()
        print("  >>> CONEXION EXITOSA via zkaccess-c3!")

        # Intentar obtener serial
        try:
            params = panel.get_device_param(['SerialNumber'])
            print(f"  Serial: {params}")
        except Exception as e:
            print(f"  Serial: no disponible ({e})")

        panel.disconnect()
        return True
    except ImportError:
        print("  zkaccess-c3 no instalado (pip install zkaccess-c3)")
        return False
    except Exception as e:
        print(f"  Error: {e}")
        return False


def main():
    if len(sys.argv) < 2:
        print("Uso: python3 test_raw_diagnosis.py <host> [puerto]")
        sys.exit(1)

    host = sys.argv[1]
    port = int(sys.argv[2]) if len(sys.argv) > 2 else 4370

    print("=" * 60)
    print(f"  Diagnostico Raw - Panel C3-400")
    print(f"  Host:   {host}")
    print(f"  Puerto: {port}")
    print(f"  Fecha:  {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)

    # Resolver DNS
    try:
        ip = socket.gethostbyname(host)
        print(f"\n  DNS: {host} -> {ip}")
    except socket.gaierror as e:
        print(f"\n  DNS FALLO: {e}")
        sys.exit(1)

    # Test 1: Escucha pasiva
    test_passive_listen(ip, port)

    # Test 2: Handshake ZK estándar
    test_zk_connect(ip, port)

    # Test 3: Probar comm keys
    test_zk_with_comm_keys(ip, port)

    # Test 4: UDP
    test_pull_sdk_protocol(ip, port)

    # Test 5: zkaccess-c3 library
    test_zkaccess_c3_lib(ip, port)

    print("\n" + "=" * 60)
    print("  Diagnostico completado")
    print("=" * 60)


if __name__ == '__main__':
    main()
