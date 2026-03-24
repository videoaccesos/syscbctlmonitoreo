#!/usr/bin/env python3
"""
Lector raw de tablas ZK C3 - maneja tablas grandes (users, transactions)

La libreria c3 falla con tablas grandes porque:
1. recv() no maneja fragmentacion TCP
2. No soporta respuestas multi-paquete

Este script implementa el protocolo a bajo nivel para leer correctamente.

Uso:
  python3 read_panel_tables.py interlomas.ddns.accessbot.net
  python3 read_panel_tables.py interlomas.ddns.accessbot.net --table user
  python3 read_panel_tables.py interlomas.ddns.accessbot.net --table transaction --limit 50
"""

import sys
import argparse
import socket
import struct
import time
from datetime import datetime


# ============================================================
# Constantes del protocolo C3
# ============================================================
C3_START = 0xAA
C3_END = 0x55
C3_PROTO_V1 = 0x01
C3_PORT = 4370

CMD_CONNECT_SESSION = 0x76
CMD_CONNECT_SESSIONLESS = 0x01
CMD_DISCONNECT = 0x02
CMD_DATATABLE_CFG = 0x06
CMD_GETDATA = 0x08
CMD_GETPARAM = 0x04

REPLY_OK = 0xC8
REPLY_ERROR = 0xC9

CRC_POLY_16 = 0xA001


# ============================================================
# CRC16
# ============================================================
def crc16(data):
    crc = 0x0000
    for byte in data:
        b = byte if isinstance(byte, int) else ord(byte)
        b = b & 0xFF
        msb = crc >> 8
        # calc divisor
        poly = 0
        val = crc ^ b
        for _ in range(8):
            if ((poly ^ val) & 0x0001) == 1:
                poly = (poly >> 1) ^ CRC_POLY_16
            else:
                poly = poly >> 1
            val = val >> 1
        crc = msb ^ poly
    return crc & 0xFFFF


def lsb(val):
    return val & 0xFF


def msb(val):
    return (val >> 8) & 0xFF


# ============================================================
# Protocolo C3 raw
# ============================================================
class C3Raw:
    def __init__(self, host, port=C3_PORT, timeout=10):
        self.host = host
        self.port = port
        self.timeout = timeout
        self.sock = None
        self.session_id = 0xFEFE
        self.request_nr = 0
        self.session_less = True
        self.connected = False

    def _build_msg(self, command, data=None):
        """Construye mensaje C3 completo."""
        payload_len = (len(data) if data else 0)
        if not self.session_less and self.session_id is not None:
            payload_len += 4

        msg = bytearray([
            C3_PROTO_V1,
            command,
            lsb(payload_len),
            msb(payload_len),
        ])

        if not self.session_less and self.session_id is not None:
            msg.append(lsb(self.session_id))
            msg.append(msb(self.session_id))
            msg.append(lsb(self.request_nr))
            msg.append(msb(self.request_nr))

        if data:
            for b in data:
                if isinstance(b, int):
                    msg.append(b)
                elif isinstance(b, str):
                    msg.append(ord(b))

        checksum = crc16(msg)
        msg.append(lsb(checksum))
        msg.append(msb(checksum))
        msg.insert(0, C3_START)
        msg.append(C3_END)
        return bytes(msg)

    def _recv_exact(self, n, timeout=None):
        """Recibe exactamente n bytes, manejando fragmentacion TCP."""
        self.sock.settimeout(timeout or self.timeout)
        data = bytearray()
        retries = 0
        while len(data) < n:
            try:
                chunk = self.sock.recv(n - len(data))
                if not chunk:
                    break
                data.extend(chunk)
                retries = 0
            except socket.timeout:
                retries += 1
                if retries > 3:
                    break
        return bytes(data)

    def _recv_message(self, timeout=None):
        """Recibe un mensaje C3 completo. Retorna (command, payload)."""
        header = self._recv_exact(5, timeout)
        if len(header) < 5:
            return None, b''

        if header[0] != C3_START:
            return None, b''

        command = header[2]
        data_size = header[3] + (header[4] * 256)

        # Payload + 2 bytes CRC + 1 byte END
        rest = self._recv_exact(data_size + 3, timeout)
        if len(rest) < data_size + 3:
            # Partial response
            pass

        full = header + rest
        if len(rest) >= 3 and rest[-1] == C3_END:
            # Extraer payload (sin header 5 bytes, sin CRC 2 bytes, sin END 1 byte)
            payload = full[5:-3]
        else:
            payload = rest[:-3] if len(rest) >= 3 else rest

        # Si tiene session, quitar session_id (4 bytes) del inicio del payload
        session_offset = 0
        if not self.session_less and data_size > 2:
            session_offset = 4

        return command, payload[session_offset:]

    def connect(self):
        """Conecta al panel C3."""
        ip = socket.gethostbyname(self.host)
        self.sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.sock.settimeout(self.timeout)
        self.sock.connect((ip, self.port))

        # Intentar conexion con session
        msg = self._build_msg(CMD_CONNECT_SESSION)
        self.sock.send(msg)
        self.request_nr += 1

        cmd, payload = self._recv_message()
        if cmd == REPLY_OK and len(payload) >= 2:
            self.session_id = payload[1] << 8 | payload[0]
            self.session_less = False
            self.connected = True
            return True

        # Fallback: sin session
        self.session_id = None
        self.session_less = True
        msg = self._build_msg(CMD_CONNECT_SESSIONLESS)
        self.sock.send(msg)
        self.request_nr += 1

        cmd, payload = self._recv_message()
        if cmd == REPLY_OK:
            self.connected = True
            return True

        return False

    def disconnect(self):
        if self.sock:
            try:
                msg = self._build_msg(CMD_DISCONNECT)
                self.sock.send(msg)
                self.request_nr += 1
            except Exception:
                pass
            try:
                self.sock.close()
            except Exception:
                pass
        self.connected = False

    def get_param(self, param_name):
        """Lee un parametro del panel."""
        data = list(param_name.encode('ascii')) + [0x00]
        msg = self._build_msg(CMD_GETPARAM, data)
        self.sock.send(msg)
        self.request_nr += 1

        cmd, payload = self._recv_message()
        if cmd == REPLY_OK and payload:
            # Parsear key=value
            text = payload.decode('ascii', errors='ignore').strip('\x00')
            result = {}
            for pair in text.split(','):
                if '=' in pair:
                    k, v = pair.split('=', 1)
                    result[k.strip()] = v.strip()
            return result.get(param_name, text)
        return None

    def get_data_table_cfg(self):
        """Obtiene configuracion de tablas de datos."""
        msg = self._build_msg(CMD_DATATABLE_CFG)
        self.sock.send(msg)
        self.request_nr += 1

        cmd, payload = self._recv_message()
        if cmd != REPLY_OK or not payload:
            return []

        tables = []
        for line in payload.split(b'\x0a'):
            if not line.strip():
                continue
            kv = {}
            text = line.decode('ascii', errors='ignore')
            for pair in text.split(','):
                if '=' in pair:
                    k, v = pair.split('=', 1)
                    kv[k.strip()] = v.strip()
            if 'tablename' in kv:
                tables.append(kv)
        return tables

    def get_data_raw(self, table_index, field_indexes, timeout=15):
        """Lee datos raw de una tabla. Retorna el payload binario."""
        params = [table_index, len(field_indexes)] + field_indexes + [0, 0]
        msg = self._build_msg(CMD_GETDATA, params)
        self.sock.send(msg)
        self.request_nr += 1

        cmd, payload = self._recv_message(timeout=timeout)
        return cmd, payload


def parse_table_cfg(cfg_text):
    """Parsea la config de una tabla en fields list.
    Formato: tablename=user,0,7,1,CardNo,2,i,Pin,2,s,Password,2,s,...
    """
    parts = cfg_text.split(',')
    if len(parts) < 3:
        return None, None, []

    name_part = parts[0]  # tablename=xxx
    name = name_part.split('=')[1] if '=' in name_part else name_part
    table_index = int(parts[1])
    field_count = int(parts[2])

    fields = []
    i = 3
    while i + 2 < len(parts) and len(fields) < field_count:
        try:
            field_idx = int(parts[i])
            field_name = parts[i + 1]
            field_size = int(parts[i + 2])
            field_type = parts[i + 3] if i + 3 < len(parts) else 's'
            fields.append({
                'index': field_idx,
                'name': field_name,
                'size': field_size,
                'type': field_type,
            })
            i += 4
        except (ValueError, IndexError):
            i += 1

    return name, table_index, fields


def parse_binary_data(payload, table_index, fields):
    """Parsea datos binarios de una tabla C3."""
    records = []

    if not payload or len(payload) < 2:
        return records

    resp_table = payload[0]
    if resp_table != table_index:
        # Podria ser un offset o formato diferente
        print(f"  AVISO: tabla respuesta={resp_table}, esperada={table_index}")
        # Intentar parsear de todos modos si el primer byte es 0
        if resp_table != 0:
            return records

    resp_field_cnt = payload[1]
    resp_field_indexes = list(payload[2:2 + resp_field_cnt])
    data = payload[2 + resp_field_cnt:]

    record_count = 0
    while data and len(data) > 1:
        record = {}
        valid = True

        for fidx in resp_field_indexes:
            if not data:
                valid = False
                break

            field_size = data[0]
            if field_size > len(data) - 1:
                valid = False
                break

            field_info = next((f for f in fields if f['index'] == fidx), None)
            if field_info:
                raw = data[1:1 + field_size]
                if field_info['type'] == 'i':
                    record[field_info['name']] = int.from_bytes(raw, 'little') if raw else 0
                else:
                    record[field_info['name']] = raw.decode('ascii', errors='ignore')
            data = data[1 + field_size:]

        if valid and record:
            records.append(record)
            record_count += 1
        else:
            break

    return records


def format_transaction(rec):
    """Formatea un registro de transaccion legible."""
    card = rec.get('Cardno', rec.get('CardNo', '?'))
    pin = rec.get('Pin', '?')
    door = rec.get('DoorID', '?')
    event = rec.get('EventType', '?')
    inout = rec.get('InOutState', '?')
    ts = rec.get('Time_second', '?')

    # Mapeo de eventos comunes
    event_names = {
        0: 'Acceso OK',
        1: 'Acceso en hora normal',
        8: 'Apertura remota',
        9: 'Cierre remoto',
        22: 'Zona horaria ilegal',
        23: 'Acceso denegado',
        27: 'Tarjeta no registrada',
        29: 'Tarjeta expirada',
        200: 'Puerta abierta correcta',
        201: 'Puerta cerrada correcta',
        202: 'Boton salida',
        206: 'Inicio dispositivo',
        255: 'Status heartbeat',
    }
    event_name = event_names.get(event, f'Evento {event}')
    inout_names = {0: 'Entrada', 2: 'N/A', 3: 'Salida'}
    inout_name = inout_names.get(inout, f'Dir {inout}')

    return f"[{ts}] Puerta {door} | {event_name} | Tarjeta: {card} | PIN: {pin} | {inout_name}"


def main():
    parser = argparse.ArgumentParser(description='Lector raw de tablas ZK C3')
    parser.add_argument('host', help='IP o hostname del panel')
    parser.add_argument('--table', '-t', metavar='NAME',
                        help='Tabla especifica a leer (user, transaction, timezone, etc)')
    parser.add_argument('--limit', '-l', type=int, default=100,
                        help='Maximo de registros a mostrar (default: 100)')
    parser.add_argument('--timeout', type=int, default=15,
                        help='Timeout para lectura de tabla (default: 15s)')
    parser.add_argument('--debug', action='store_true',
                        help='Mostrar datos raw en hex')
    args = parser.parse_args()

    print("=" * 70)
    print(f"  ZK C3 - Lector de Tablas Raw")
    print(f"  Host: {args.host}")
    print(f"  Fecha: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 70)

    # Conectar
    panel = C3Raw(args.host)
    print(f"\nConectando a {args.host}...")
    if not panel.connect():
        print("ERROR: No se pudo conectar")
        sys.exit(1)
    print(f"Conectado (session_id={panel.session_id:#06x}, session_less={panel.session_less})")

    # Info basica
    serial = panel.get_param('~SerialNumber')
    firmware = panel.get_param('FirmVer')
    print(f"  Serial:   {serial}")
    print(f"  Firmware: {firmware}")

    # Obtener config de tablas
    print("\n" + "-" * 70)
    print("  CONFIGURACION DE TABLAS")
    print("-" * 70)

    msg = panel._build_msg(CMD_DATATABLE_CFG)
    panel.sock.send(msg)
    panel.request_nr += 1
    cmd, payload = panel._recv_message()

    if cmd != REPLY_OK or not payload:
        print("  ERROR: No se pudo obtener config de tablas")
        panel.disconnect()
        sys.exit(1)

    # Parsear cada linea de config
    tables = {}
    for line in payload.split(b'\x0a'):
        if not line.strip():
            continue
        text = line.decode('ascii', errors='ignore')
        parts = text.split(',')
        if len(parts) >= 3 and '=' in parts[0]:
            name = parts[0].split('=')[1]
            try:
                table_idx = int(parts[1])
                field_count = int(parts[2])
            except ValueError:
                continue

            fields = []
            i = 3
            while i + 3 < len(parts) and len(fields) < field_count:
                try:
                    fidx = int(parts[i])
                    fname = parts[i + 1]
                    fsize = int(parts[i + 2])
                    ftype = parts[i + 3]
                    fields.append({
                        'index': fidx,
                        'name': fname,
                        'size': fsize,
                        'type': ftype,
                    })
                    i += 4
                except (ValueError, IndexError):
                    i += 1

            tables[name] = {
                'index': table_idx,
                'fields': fields,
                'raw_config': text,
            }
            field_names = [f['name'] for f in fields]
            print(f"  {name} (idx={table_idx}): {', '.join(field_names)}")

    # Determinar que tablas leer
    if args.table:
        tables_to_read = [args.table]
    else:
        tables_to_read = ['user', 'userauthorize', 'timezone', 'transaction']

    # Leer cada tabla
    for table_name in tables_to_read:
        print("\n" + "=" * 70)
        print(f"  TABLA: {table_name}")
        print("=" * 70)

        if table_name not in tables:
            print(f"  ERROR: Tabla '{table_name}' no existe")
            print(f"  Disponibles: {', '.join(tables.keys())}")
            continue

        tbl = tables[table_name]
        field_indexes = [f['index'] for f in tbl['fields']]

        # Reconectar si necesario
        if not panel.connected:
            print("  Reconectando...")
            panel = C3Raw(args.host)
            if not panel.connect():
                print("  ERROR: No se pudo reconectar")
                break
            # Re-obtener tabla cfg
            print("  Reconectado OK")

        print(f"  Enviando GETDATA (tabla_idx={tbl['index']}, fields={field_indexes})...")
        start_time = time.time()
        cmd, raw_payload = panel.get_data_raw(tbl['index'], field_indexes, args.timeout)
        elapsed = time.time() - start_time

        if cmd is None:
            print(f"  ERROR: Sin respuesta ({elapsed:.1f}s)")
            panel.connected = False
            continue

        if cmd == REPLY_ERROR:
            err = raw_payload[-1] if raw_payload else '?'
            print(f"  ERROR del panel: {err}")
            continue

        if not raw_payload:
            print(f"  Tabla vacia (0 registros)")
            continue

        print(f"  Respuesta: cmd={cmd:#04x}, {len(raw_payload)} bytes ({elapsed:.1f}s)")

        if args.debug:
            hex_dump = raw_payload[:200].hex(' ')
            print(f"  RAW (primeros 200 bytes): {hex_dump}")
            if len(raw_payload) > 200:
                print(f"  ... ({len(raw_payload) - 200} bytes mas)")

        # Parsear datos binarios
        records = parse_binary_data(raw_payload, tbl['index'], tbl['fields'])

        if not records:
            # Intentar parsear con index 0 si el panel reporto index distinto
            if raw_payload and raw_payload[0] == 0:
                print(f"  Re-intentando parse con tabla_idx=0...")
                # El panel puede reportar 0 como respuesta generica
                modified_payload = bytes([tbl['index']]) + raw_payload[1:]
                records = parse_binary_data(modified_payload, tbl['index'], tbl['fields'])

        if not records:
            print(f"  No se pudieron parsear registros")
            if args.debug or len(raw_payload) < 50:
                print(f"  Payload completo: {raw_payload.hex(' ')}")
            continue

        print(f"  Total registros: {len(records)}")
        print("-" * 70)

        # Mostrar registros
        shown = min(len(records), args.limit)
        for i, rec in enumerate(records[:shown]):
            if table_name == 'transaction':
                print(f"  {format_transaction(rec)}")
            elif table_name == 'user':
                card = rec.get('CardNo', '?')
                pin = rec.get('Pin', '?')
                group = rec.get('Group', '?')
                start = rec.get('StartTime', '?')
                end = rec.get('EndTime', '?')
                super_auth = rec.get('SuperAuthorize', 0)
                role = 'SUPER' if super_auth else 'normal'
                print(f"  [{i+1:4d}] Tarjeta: {card:>12s} | PIN: {pin:>8s} | "
                      f"Grupo: {group} | {start} - {end} | {role}")
            elif table_name == 'userauthorize':
                pin = rec.get('Pin', '?')
                tz = rec.get('AuthorizeTimezoneId', '?')
                door = rec.get('AuthorizeDoorId', '?')
                print(f"  [{i+1:4d}] PIN: {pin} | Timezone: {tz} | Puerta: {door}")
            else:
                print(f"  [{i+1:4d}] {rec}")

        if len(records) > shown:
            print(f"  ... ({len(records) - shown} registros mas, usa --limit para ver mas)")

    # Desconectar
    panel.disconnect()
    print("\n" + "=" * 70)
    print("  Desconectado OK")
    print("=" * 70)


if __name__ == '__main__':
    main()
