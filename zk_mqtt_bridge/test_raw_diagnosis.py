#!/usr/bin/env python3
"""
Diagnostico raw del panel C3-400.

Envia diferentes handshakes y captura la respuesta raw,
sin asumir un protocolo especifico.

Uso:
  python3 test_raw_diagnosis.py 192.168.1.201 4370
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


def zk_checksum(data: bytes) -> int:
    chksum = 0
    for i in range(0, len(data), 2):
        if i + 1 < len(data):
            chksum += struct.unpack('<H', data[i:i + 2])[0]
        else:
            chksum += data[i]
    chksum = (65536 - (chksum % 65536)) & 0xFFFF
    return chksum


def build_zk_packet(command: int, session_id: int = 0, reply_id: int = 1,
                    data: bytes = b'') -> bytes:
    """Construye un paquete ZK con magic 0x5050."""
    buf = struct.pack('<HHHH', command, 0, session_id, reply_id) + data
    chk = zk_checksum(buf)
    buf = struct.pack('<HHHH', command, chk, session_id, reply_id) + data
    header = struct.pack('<HH', 0x5050, len(buf))
    return header + buf


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


def parse_zk_response(data: bytes) -> dict:
    """Parsea una respuesta ZK y retorna info."""
    result = {'raw': data, 'valid': False}
    if len(data) < 4:
        return result
    magic = struct.unpack('<H', data[0:2])[0]
    result['magic'] = magic
    if magic == 0x5050 and len(data) >= 12:
        length = struct.unpack('<H', data[2:4])[0]
        cmd = struct.unpack('<H', data[4:6])[0]
        checksum = struct.unpack('<H', data[6:8])[0]
        session = struct.unpack('<H', data[8:10])[0]
        reply = struct.unpack('<H', data[10:12])[0]
        result.update({
            'valid': True, 'length': length, 'cmd': cmd,
            'checksum': checksum, 'session': session, 'reply': reply,
            'payload': data[12:] if len(data) > 12 else b'',
        })
    return result


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
            # Check if it looks like HTTP
            if data[:4] in (b'HTTP', b'GET ', b'POST', b'<!DO'):
                print("  >>> PARECE SER UN SERVIDOR HTTP/WEB en este puerto")
        else:
            print("  Sin datos - el panel espera que el cliente hable primero")
        sock.close()
        return data
    except Exception as e:
        print(f"  Error: {e}")
        return b''


def test_tcp_nodelay(ip, port):
    """Prueba con TCP_NODELAY y delay antes de enviar."""
    print("\n[TEST 2] Handshake con TCP_NODELAY + delay pre-envio")
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)
    sock.settimeout(5)
    try:
        sock.connect((ip, port))
        print("  TCP conectado (TCP_NODELAY=1)")

        # Pequeño delay para que el panel esté listo
        time.sleep(0.5)

        packet = build_zk_packet(1000)  # CMD_CONNECT
        print(f"  Enviando CONNECT ({len(packet)} bytes):")
        print(hex_dump(packet))
        sock.sendall(packet)  # sendall en lugar de send

        data = try_recv(sock, timeout=5)
        if data:
            print(f"  RESPUESTA ({len(data)} bytes):")
            print(hex_dump(data))
            r = parse_zk_response(data)
            if r['valid']:
                print(f"  Parsed: cmd={r['cmd']}, session={r['session']}")
                if r['cmd'] == 2000:
                    print("  >>> HANDSHAKE EXITOSO!")
                    sock.close()
                    return True
        else:
            print("  Sin respuesta")
        sock.close()
    except Exception as e:
        print(f"  Error: {e}")
    return False


def test_zk_connect_with_commkey(ip, port):
    """Prueba handshake ZK con comm key 0 en payload (algunos paneles lo requieren)."""
    print("\n[TEST 3] Handshake con comm_key=0 en payload")
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)
    sock.settimeout(5)
    try:
        sock.connect((ip, port))
        time.sleep(0.3)

        # CONNECT con comm_key=0 como payload
        packet = build_zk_packet(1000, data=struct.pack('<I', 0))
        print(f"  Enviando CONNECT + comm_key=0 ({len(packet)} bytes):")
        print(hex_dump(packet))
        sock.sendall(packet)

        data = try_recv(sock, timeout=5)
        if data:
            print(f"  RESPUESTA ({len(data)} bytes):")
            print(hex_dump(data))
            r = parse_zk_response(data)
            if r['valid']:
                print(f"  Parsed: cmd={r['cmd']}, session={r['session']}")
                if r['cmd'] == 2000:
                    print("  >>> HANDSHAKE EXITOSO con comm_key=0!")
                elif r['cmd'] == 2001:
                    print("  >>> ERROR - panel requiere comm key diferente")
        else:
            print("  Sin respuesta")
        sock.close()
    except Exception as e:
        print(f"  Error: {e}")


def test_comm_keys_bruteforce(ip, port):
    """Prueba varios comm keys comunes."""
    print("\n[TEST 4] Probando comm keys comunes")
    common_keys = [0, 123456, 1, 111111, 888888, 999999, 12345678]

    for key in common_keys:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)
        sock.settimeout(3)
        try:
            sock.connect((ip, port))
            time.sleep(0.2)

            data_payload = struct.pack('<I', key) if key > 0 else b''
            packet = build_zk_packet(1000, data=data_payload)
            sock.sendall(packet)

            data = try_recv(sock, timeout=3)
            if data:
                r = parse_zk_response(data)
                if r['valid']:
                    status = "OK!" if r['cmd'] == 2000 else f"cmd={r['cmd']}"
                    print(f"  Key {key:>10d}: RESPUESTA -> {status}")
                    if r['cmd'] == 2000:
                        print(f"  >>> COMM KEY ENCONTRADO: {key}")
                        sock.close()
                        return key
                else:
                    print(f"  Key {key:>10d}: respuesta no-ZK ({len(data)} bytes)")
                    print(hex_dump(data[:32]))
            else:
                print(f"  Key {key:>10d}: sin respuesta")
            sock.close()
        except Exception as e:
            print(f"  Key {key:>10d}: error -> {e}")
            try:
                sock.close()
            except Exception:
                pass
        time.sleep(0.3)

    print("  Ningun comm key funciono")
    return None


def test_udp(ip, port):
    """Prueba protocolo ZK via UDP (algunos C3 usan UDP en vez de TCP)."""
    print(f"\n[TEST 5] Protocolo ZK via UDP {ip}:{port}")
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.settimeout(3)
    try:
        # CONNECT sin payload
        packet = build_zk_packet(1000)
        sock.sendto(packet, (ip, port))
        print(f"  Enviado UDP CONNECT ({len(packet)} bytes)")

        try:
            data, addr = sock.recvfrom(4096)
            if data:
                print(f"  RESPUESTA UDP de {addr} ({len(data)} bytes):")
                print(hex_dump(data))
                r = parse_zk_response(data)
                if r['valid']:
                    print(f"  Parsed: cmd={r['cmd']}, session={r['session']}")
                    if r['cmd'] == 2000:
                        print("  >>> HANDSHAKE UDP EXITOSO!")
                        sock.close()
                        return True
        except socket.timeout:
            print("  Sin respuesta UDP")
        sock.close()

        # Intentar UDP con comm_key=0
        print(f"\n  Probando UDP + comm_key=0...")
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        sock.settimeout(3)
        packet = build_zk_packet(1000, data=struct.pack('<I', 0))
        sock.sendto(packet, (ip, port))
        try:
            data, addr = sock.recvfrom(4096)
            if data:
                print(f"  RESPUESTA UDP ({len(data)} bytes):")
                print(hex_dump(data))
                r = parse_zk_response(data)
                if r['valid'] and r['cmd'] == 2000:
                    print("  >>> HANDSHAKE UDP + comm_key=0 EXITOSO!")
                    sock.close()
                    return True
        except socket.timeout:
            print("  Sin respuesta UDP con comm_key=0")
        sock.close()
    except Exception as e:
        print(f"  Error UDP: {e}")
    return False


def test_http_check(ip, port):
    """Verifica si el puerto sirve HTTP (web interface del panel)."""
    print(f"\n[TEST 6] Verificar si el puerto tiene servicio HTTP")
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(3)
    try:
        sock.connect((ip, port))
        # Enviar un HTTP GET simple
        http_req = b"GET / HTTP/1.0\r\nHost: " + ip.encode() + b"\r\n\r\n"
        sock.sendall(http_req)
        data = try_recv(sock, timeout=3)
        if data:
            # Check if response looks like HTTP
            text = data[:200].decode('ascii', errors='replace')
            if 'HTTP' in text or '<html' in text.lower() or '<HTML' in text:
                print(f"  >>> PUERTO {port} TIENE SERVIDOR WEB!")
                print(f"  Respuesta: {text[:150]}")
                print(f"  El protocolo ZK puede estar en OTRO puerto")
                sock.close()
                return True
            else:
                print(f"  No es HTTP ({len(data)} bytes respuesta)")
                print(hex_dump(data[:64]))
        else:
            print(f"  Sin respuesta HTTP")
        sock.close()
    except Exception as e:
        print(f"  Error: {e}")
    return False


def test_other_ports(ip):
    """Escanea puertos comunes de ZKTeco para encontrar el servicio correcto."""
    print(f"\n[TEST 7] Escaneo de puertos ZKTeco comunes")
    # Puertos que usan los paneles C3-400 / inBio
    ports_to_try = [4370, 80, 8080, 4371, 5005, 14370, 4369, 443, 8000]
    open_ports = []

    for p in ports_to_try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(1.5)
        try:
            sock.connect((ip, p))
            open_ports.append(p)
            print(f"  Puerto {p:>5d}: ABIERTO")

            # Intentar handshake ZK en puertos alternativos
            if p != 4370:
                time.sleep(0.2)
                packet = build_zk_packet(1000)
                sock.sendall(packet)
                data = try_recv(sock, timeout=2)
                if data:
                    r = parse_zk_response(data)
                    if r['valid'] and r['cmd'] == 2000:
                        print(f"  >>> PROTOCOLO ZK ENCONTRADO EN PUERTO {p}!")
                        sock.close()
                        return p
                    elif r['valid']:
                        print(f"    Respuesta ZK cmd={r['cmd']}")
                    else:
                        # Check HTTP
                        text = data[:50].decode('ascii', errors='replace')
                        if 'HTTP' in text or '<' in text:
                            print(f"    (servidor web)")
            sock.close()
        except (socket.timeout, ConnectionRefusedError, OSError):
            pass
        finally:
            try:
                sock.close()
            except Exception:
                pass

    if not open_ports:
        print("  Ningun puerto alternativo abierto")
    return None


def test_without_header(ip, port):
    """Prueba enviar solo el payload sin el header 0x5050 (variante rara)."""
    print(f"\n[TEST 8] Payload sin header 0x5050")
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)
    sock.settimeout(3)
    try:
        sock.connect((ip, port))
        time.sleep(0.3)

        # Solo 8 bytes de comando, sin header
        command = 1000
        reply_id = 1
        session_id = 0
        buf = struct.pack('<HHHH', command, 0, session_id, reply_id)
        chk = zk_checksum(buf)
        buf = struct.pack('<HHHH', command, chk, session_id, reply_id)

        print(f"  Enviando sin header ({len(buf)} bytes):")
        print(hex_dump(buf))
        sock.sendall(buf)

        data = try_recv(sock, timeout=3)
        if data:
            print(f"  RESPUESTA ({len(data)} bytes):")
            print(hex_dump(data))
        else:
            print("  Sin respuesta")
        sock.close()
    except Exception as e:
        print(f"  Error: {e}")


def test_zkaccess_c3_lib(ip, port):
    """Intenta usar la libreria zkaccess-c3 directamente."""
    print("\n[TEST 9] Libreria zkaccess-c3 (pip)")
    try:
        import zkaccess_c3
        ver = getattr(zkaccess_c3, '__version__', '?')
        print(f"  zkaccess-c3 version: {ver}")
        C3 = zkaccess_c3.C3
        panel = C3(ip, port)
        print(f"  Conectando a {ip}:{port}...")
        panel.connect()
        print("  >>> CONEXION EXITOSA via zkaccess-c3!")

        try:
            params = panel.get_device_param(['SerialNumber'])
            print(f"  Serial: {params}")
        except Exception as e:
            print(f"  Serial: no disponible ({e})")

        panel.disconnect()
        return True
    except ImportError:
        print("  No instalado. Instalar con:")
        print("    pip install zkaccess-c3")
        return False
    except Exception as e:
        print(f"  Error: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_pyzk_lib(ip, port):
    """Intenta usar la libreria pyzk (para terminales de asistencia)."""
    print("\n[TEST 10] Libreria pyzk / zk (pip)")
    try:
        from zk import ZK
        print(f"  pyzk disponible")
        zk = ZK(ip, port=port, timeout=5)
        print(f"  Conectando a {ip}:{port}...")
        conn = zk.connect()
        if conn:
            print("  >>> CONEXION EXITOSA via pyzk!")
            try:
                serial = conn.get_serialnumber()
                print(f"  Serial: {serial}")
            except Exception as e:
                print(f"  Serial: {e}")
            conn.disconnect()
            return True
    except ImportError:
        print("  No instalado. Instalar con:")
        print("    pip install pyzk")
        return False
    except Exception as e:
        print(f"  Error: {e}")
        return False


def main():
    if len(sys.argv) < 2:
        print("Uso: python3 test_raw_diagnosis.py <host> [puerto]")
        print()
        print("Ejemplos:")
        print("  python3 test_raw_diagnosis.py 192.168.1.201 4370")
        print("  python3 test_raw_diagnosis.py miguel.ddns.accessbot.net 4370")
        sys.exit(1)

    host = sys.argv[1]
    port = int(sys.argv[2]) if len(sys.argv) > 2 else 4370

    print("=" * 60)
    print(f"  Diagnostico Completo - Panel C3-400")
    print(f"  Host:   {host}")
    print(f"  Puerto: {port}")
    print(f"  Fecha:  {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)

    # Resolver DNS
    try:
        ip = socket.gethostbyname(host)
        if ip != host:
            print(f"\n  DNS: {host} -> {ip}")
        else:
            print(f"\n  IP directa: {ip}")
    except socket.gaierror as e:
        print(f"\n  DNS FALLO: {e}")
        sys.exit(1)

    # Verificar TCP primero
    print(f"\n  Verificando TCP {ip}:{port}...")
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(5)
    try:
        t0 = time.time()
        sock.connect((ip, port))
        latency = (time.time() - t0) * 1000
        print(f"  TCP OK ({latency:.0f}ms)")
        sock.close()
    except Exception as e:
        print(f"  TCP FALLO: {e}")
        print("  Abortando diagnostico - el panel no es alcanzable")
        sys.exit(1)

    # Ejecutar todos los tests
    test_passive_listen(ip, port)
    test_tcp_nodelay(ip, port)
    test_zk_connect_with_commkey(ip, port)
    test_comm_keys_bruteforce(ip, port)
    test_udp(ip, port)
    test_http_check(ip, port)
    test_other_ports(ip)
    test_without_header(ip, port)
    test_zkaccess_c3_lib(ip, port)
    test_pyzk_lib(ip, port)

    print("\n" + "=" * 60)
    print("  Diagnostico completado")
    print()
    print("  Si NINGUN test funciono:")
    print("    1. Instalar zkaccess-c3: pip install zkaccess-c3")
    print("    2. Instalar pyzk: pip install pyzk")
    print("    3. Verificar en ZKAccess que Communication Type=TCP/IP")
    print("    4. Verificar que no hay firewall bloqueando")
    print("    5. Capturar trafico con Wireshark mientras")
    print("       ZKAccess conecta exitosamente")
    print("=" * 60)


if __name__ == '__main__':
    main()
