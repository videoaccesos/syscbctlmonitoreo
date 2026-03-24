#!/usr/bin/env python3
"""
Lector de tablas ZK C3 - soporta transferencia chunked (firmware v18+)

Firmware v18+ envía tablas grandes en múltiples frames:
1. GETDATA → respuesta header con total_size
2. El panel envía chunks de datos como frames adicionales
3. Este script lee todos los frames y ensambla los datos

Uso:
  python3 read_panel_tables.py interlomas.ddns.accessbot.net
  python3 read_panel_tables.py interlomas.ddns.accessbot.net --table user
  python3 read_panel_tables.py interlomas.ddns.accessbot.net --table transaction --limit 50
  python3 read_panel_tables.py interlomas.ddns.accessbot.net --debug
"""

import sys
import argparse
import socket
import struct
import time
from datetime import datetime
from c3 import C3
from c3 import consts, crc as c3_crc, utils


# ============================================================
# Funciones de protocolo de bajo nivel
# ============================================================
def recv_exact(sock, n, timeout=10):
    """Recibe exactamente n bytes manejando fragmentación TCP."""
    sock.settimeout(timeout)
    data = bytearray()
    deadline = time.time() + timeout
    while len(data) < n:
        remaining_time = deadline - time.time()
        if remaining_time <= 0:
            break
        sock.settimeout(max(remaining_time, 0.5))
        try:
            chunk = sock.recv(n - len(data))
            if not chunk:
                break
            data.extend(chunk)
        except socket.timeout:
            if len(data) > 0:
                continue
            break
    return bytes(data)


def recv_c3_frame(sock, timeout=10):
    """Recibe un frame C3 completo del socket.
    Retorna (command, payload_data) o (None, b'') si timeout.
    """
    try:
        header = recv_exact(sock, 5, timeout)
    except Exception:
        return None, b''

    if len(header) < 5:
        return None, b''

    if header[0] != consts.C3_MESSAGE_START:
        return None, b''

    command = header[2]
    data_size = header[3] + (header[4] * 256)

    # Leer payload + CRC(2) + END(1)
    rest = recv_exact(sock, data_size + 3, timeout)
    if len(rest) < data_size + 3:
        return command, b''

    full = header + rest
    # Extraer payload sin header(5), CRC(2), END(1)
    payload = bytearray(full[5:-3])

    return command, bytes(payload)


def patched_receive(self):
    """Receive mejorado con recv_exact para fragmentación TCP."""
    self._sock.settimeout(self.receive_timeout)

    header = bytes()
    for _ in range(self.receive_retries):
        try:
            header = recv_exact(self._sock, 5, self.receive_timeout)
            if len(header) == 5:
                break
        except socket.timeout:
            pass

    if len(header) != 5:
        raise ConnectionError(
            f"Invalid response header received; expected 5 bytes, received {header}"
        )

    message = bytearray()
    received_command, data_size, protocol_version = self._get_message_header(header)

    remaining = data_size + 3
    payload = recv_exact(self._sock, remaining, self.receive_timeout)

    if data_size > 0:
        full_msg = header + payload
        message = self._get_message(full_msg)

    if len(message) != data_size:
        raise ValueError(
            f"Length of received message ({len(message)}) doesn't match specified ({data_size})"
        )

    if received_command == consts.C3_REPLY_OK:
        pass
    elif received_command == consts.C3_REPLY_ERROR:
        error = utils.byte_to_signed_int(message[-1])
        raise ConnectionError(
            f"Error {error}: {consts.Errors.get(error, 'Unknown')}"
        )

    return message, data_size, protocol_version


# ============================================================
# Lectura de tablas con soporte chunked
# ============================================================
def read_table_chunked(panel, table_name, fields_info, table_index,
                       debug=False, timeout=30):
    """Lee una tabla con soporte para transferencia multi-frame (firmware v18+).

    Protocolo:
    1. Envía GETDATA → recibe header con total_size
    2. Lee frames adicionales del socket hasta tener todos los datos
    3. Parsea los datos binarios concatenados
    """
    field_indexes = [f['index'] for f in fields_info]
    field_indexes.sort()

    # Enviar GETDATA
    parameters = [table_index, len(field_indexes)] + field_indexes + [0, 0]
    message, msg_size = panel._send_receive(consts.Command.GETDATA, parameters)

    if debug:
        print(f"  DEBUG: respuesta inicial: {len(message)} bytes")
        print(f"  DEBUG: hex: {message.hex(' ')}")

    if not message or len(message) < 2:
        return []

    # Caso 1: Respuesta directa con datos (tabla pequeña o firmware viejo)
    if message[0] == table_index:
        if debug:
            print(f"  DEBUG: respuesta directa (tabla_idx={table_index})")
        return parse_table_data(message, fields_info, table_index, debug)

    # Caso 2: Header de transferencia chunked (primer byte != table_index)
    # Formato observado: 00 [size_lo32] [size_lo32] [hash32] [extra32]
    if message[0] == 0x00 and len(message) >= 9:
        total_size = struct.unpack_from('<I', message, 1)[0]
        total_size2 = struct.unpack_from('<I', message, 5)[0]

        if debug:
            print(f"  DEBUG: header chunked detectado")
            print(f"  DEBUG: total_size={total_size}, size2={total_size2}")
            if len(message) >= 17:
                extra1 = struct.unpack_from('<I', message, 9)[0]
                extra2 = struct.unpack_from('<I', message, 13)[0]
                print(f"  DEBUG: extra1={extra1:#010x}, extra2={extra2}")

        print(f"  Transfiriendo {total_size} bytes de datos...")

        # Leer frames de datos del socket
        all_data = bytearray()
        frames_read = 0
        start = time.time()

        # Strip session info from chunked frames
        session_offset = 4 if not panel._session_less else 0

        while len(all_data) < total_size:
            elapsed = time.time() - start
            if elapsed > timeout:
                print(f"  TIMEOUT: recibidos {len(all_data)}/{total_size} bytes en {elapsed:.1f}s")
                break

            cmd, payload = recv_c3_frame(panel._sock, timeout=min(timeout - elapsed, 10))
            if cmd is None:
                if debug:
                    print(f"  DEBUG: frame {frames_read}: timeout/error")
                break

            # Strip session bytes si aplica
            frame_data = payload[session_offset:] if len(payload) > session_offset else payload

            if debug and frames_read < 5:
                preview = frame_data[:50].hex(' ') if frame_data else '(vacio)'
                print(f"  DEBUG: frame {frames_read}: cmd={cmd:#04x}, "
                      f"{len(frame_data)} bytes: {preview}...")

            if frame_data:
                all_data.extend(frame_data)
                frames_read += 1

            if frames_read % 50 == 0:
                pct = len(all_data) * 100 / total_size if total_size else 0
                print(f"  ... {len(all_data)}/{total_size} bytes ({pct:.0f}%) "
                      f"- {frames_read} frames", end='\r')

        elapsed = time.time() - start
        print(f"  Recibidos {len(all_data)} bytes en {frames_read} frames ({elapsed:.1f}s)")

        if debug:
            preview = all_data[:200].hex(' ') if all_data else '(vacio)'
            print(f"  DEBUG: datos ensamblados ({len(all_data)} bytes): {preview}")
            if len(all_data) > 200:
                print(f"  DEBUG: ... ({len(all_data) - 200} bytes mas)")

        if not all_data:
            return []

        # Los datos ensamblados deben empezar con el formato de tabla normal
        return parse_table_data(bytes(all_data), fields_info, table_index, debug)

    # Caso 3: Respuesta desconocida
    print(f"  AVISO: formato respuesta desconocido (byte0={message[0]:#04x})")
    # Intentar parsear de todos modos
    return parse_table_data(message, fields_info, table_index, debug)


def parse_table_data(data, fields_info, expected_table_idx, debug=False):
    """Parsea datos binarios de tabla C3.

    Formato: [table_idx] [field_count] [field_idx1, field_idx2, ...] [records...]
    Cada campo en un record: [size_byte] [data_bytes...]
    """
    if not data or len(data) < 3:
        return []

    resp_table = data[0]
    resp_field_cnt = data[1]

    # Validar
    if resp_field_cnt == 0 or resp_field_cnt > 30:
        if debug:
            print(f"  DEBUG parse: field_cnt={resp_field_cnt} invalido")
        # Intentar con table_idx = expected
        if resp_table != expected_table_idx and len(data) > 3:
            # Tal vez el primer byte no es table_idx, probar sin él
            if debug:
                print(f"  DEBUG parse: re-intentando sin primer byte")
            return parse_table_data(data[1:], fields_info, expected_table_idx, debug)
        return []

    if resp_table != expected_table_idx:
        if debug:
            print(f"  DEBUG parse: tabla esperada={expected_table_idx}, "
                  f"recibida={resp_table}, field_cnt={resp_field_cnt}")

    resp_field_indexes = list(data[2:2 + resp_field_cnt])
    record_data = data[2 + resp_field_cnt:]

    if debug:
        print(f"  DEBUG parse: table={resp_table}, fields={resp_field_cnt}, "
              f"indexes={resp_field_indexes}, data={len(record_data)} bytes")

    records = []
    pos = 0
    while pos < len(record_data):
        record = {}
        valid = True

        for fidx in resp_field_indexes:
            if pos >= len(record_data):
                valid = False
                break

            field_size = record_data[pos]
            pos += 1

            if field_size > len(record_data) - pos or field_size > 200:
                valid = False
                pos -= 1  # Back up
                break

            field_info = next((f for f in fields_info if f['index'] == fidx), None)
            if field_info:
                raw = record_data[pos:pos + field_size]
                if field_info['type'] == 'i':
                    record[field_info['name']] = int.from_bytes(raw, 'little') if raw else 0
                else:
                    record[field_info['name']] = raw.decode('ascii', errors='ignore').rstrip('\x00')

            pos += field_size

        if valid and record:
            records.append(record)
        else:
            if debug and records:
                print(f"  DEBUG parse: parado en pos={pos}/{len(record_data)}, "
                      f"records={len(records)}")
            break

    return records


# ============================================================
# Event type mapping
# ============================================================
EVENT_NAMES = {
    0: 'Acceso OK (tarjeta)',
    1: 'Acceso en Normal Open TZ',
    2: 'Primera tarjeta abre',
    3: 'Multi-tarjeta abre',
    4: 'Password emergencia',
    5: 'Abierto en Normal Open TZ',
    6: 'Linkage trigger',
    7: 'Cancelar alarma',
    8: 'Apertura remota',
    9: 'Cierre remoto',
    10: 'Deshab Normal Open TZ',
    11: 'Hab Normal Open TZ',
    14: 'Huella OK',
    17: 'Tarjeta+Huella OK',
    20: 'Intervalo muy corto',
    21: 'TZ inactiva (tarjeta)',
    22: 'TZ ilegal',
    23: 'Acceso DENEGADO',
    24: 'Anti-passback',
    27: 'Tarjeta NO REGISTRADA',
    29: 'Tarjeta EXPIRADA',
    30: 'Password error',
    34: 'Huella no registrada',
    200: 'Puerta abierta correcta',
    201: 'Puerta cerrada correcta',
    202: 'Boton salida',
    206: 'Inicio dispositivo',
    220: 'Aux in desconectado',
    221: 'Aux in corto',
}

INOUT_NAMES = {0: 'Entrada', 2: 'N/A', 3: 'Salida', 15: 'Desconocido'}


def format_user(i, rec):
    card = rec.get('CardNo', '?')
    pin = rec.get('Pin', '?')
    group = rec.get('Group', '?')
    start = rec.get('StartTime', '?')
    end = rec.get('EndTime', '?')
    sa = rec.get('SuperAuthorize', 0)
    role = 'SUPER' if sa else 'normal'
    if isinstance(card, int):
        card = str(card)
    if isinstance(pin, int):
        pin = str(pin)
    return (f"  [{i:4d}] Tarjeta: {card:>12s} | PIN: {pin:>8s} | "
            f"Grupo: {group} | Vigencia: {start} a {end} | {role}")


def format_transaction(rec):
    card = rec.get('Cardno', rec.get('CardNo', '?'))
    pin = rec.get('Pin', '?')
    door = rec.get('DoorID', '?')
    event = rec.get('EventType', -1)
    inout = rec.get('InOutState', 2)
    ts = rec.get('Time_second', '?')

    event_name = EVENT_NAMES.get(event, f'Evento({event})')
    inout_name = INOUT_NAMES.get(inout, f'Dir({inout})')

    if isinstance(card, int):
        card = str(card)
    if isinstance(pin, int):
        pin = str(pin)
    return (f"  [{ts}] P{door} | {event_name:<28s} | "
            f"Tarjeta: {card:>12s} | PIN: {pin:>8s} | {inout_name}")


def format_userauthorize(i, rec):
    pin = rec.get('Pin', '?')
    tz = rec.get('AuthorizeTimezoneId', '?')
    door = rec.get('AuthorizeDoorId', '?')
    return f"  [{i:4d}] PIN: {pin} | Timezone: {tz} | Puerta: {door}"


# ============================================================
# Main
# ============================================================
def main():
    parser = argparse.ArgumentParser(description='Lector de tablas ZK C3')
    parser.add_argument('host', help='IP o hostname del panel')
    parser.add_argument('--table', '-t', metavar='NAME',
                        help='Tabla especifica (user, transaction, timezone, etc)')
    parser.add_argument('--limit', '-l', type=int, default=100,
                        help='Max registros a mostrar (default: 100)')
    parser.add_argument('--debug', action='store_true',
                        help='Mostrar datos raw hex')
    parser.add_argument('--timeout', type=int, default=30,
                        help='Timeout para transferencia (default: 30s)')
    args = parser.parse_args()

    print("=" * 70)
    print(f"  ZK C3 - Lector de Tablas (con soporte chunked)")
    print(f"  Host: {args.host}")
    print(f"  Fecha: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 70)

    # Monkey-patch recv
    C3._receive = patched_receive

    # Conectar
    panel = C3(args.host)
    panel.receive_timeout = args.timeout
    print(f"\nConectando a {args.host}...")
    try:
        panel.connect()
    except Exception as e:
        print(f"ERROR conectando: {e}")
        sys.exit(1)
    print("Conectado OK")

    print(f"  Serial:   {panel.serial_number}")
    print(f"  Firmware: {panel.firmware_version}")
    print(f"  Puertas:  {panel.nr_of_locks}")

    # Config de tablas
    print("\n" + "-" * 70)
    print("  TABLAS DISPONIBLES")
    print("-" * 70)

    try:
        data_cfg = panel._get_device_data_cfg()
    except Exception as e:
        print(f"  ERROR: {e}")
        panel.disconnect()
        sys.exit(1)

    tables = {}
    for cfg in data_cfg:
        fields = [{'index': f.index, 'name': f.name, 'type': f.type}
                  for f in cfg.fields]
        tables[cfg.name] = {'index': cfg.index, 'fields': fields}
        field_names = [f['name'] for f in fields]
        print(f"  {cfg.name} (idx={cfg.index}): {', '.join(field_names)}")

    # Tablas a leer
    if args.table:
        tables_to_read = [args.table]
    else:
        tables_to_read = ['user', 'userauthorize', 'timezone', 'transaction']

    for table_name in tables_to_read:
        print("\n" + "=" * 70)
        print(f"  TABLA: {table_name}")
        print("=" * 70)

        if table_name not in tables:
            print(f"  ERROR: No existe. Disponibles: {', '.join(tables.keys())}")
            continue

        tbl = tables[table_name]

        # Reconectar si necesario
        if not panel.is_connected():
            print("  Reconectando...")
            try:
                panel = C3(args.host)
                panel.receive_timeout = args.timeout
                C3._receive = patched_receive
                panel.connect()
                print("  Reconectado OK")
                data_cfg = panel._get_device_data_cfg()
                for cfg in data_cfg:
                    if cfg.name == table_name:
                        tbl = {
                            'index': cfg.index,
                            'fields': [{'index': f.index, 'name': f.name,
                                        'type': f.type} for f in cfg.fields],
                        }
                        break
            except Exception as e:
                print(f"  ERROR reconectando: {e}")
                break

        print(f"  Leyendo (idx={tbl['index']}, "
              f"campos={[f['name'] for f in tbl['fields']]})...")
        start_time = time.time()

        try:
            records = read_table_chunked(
                panel, table_name, tbl['fields'], tbl['index'],
                debug=args.debug, timeout=args.timeout
            )
        except ConnectionError as e:
            print(f"  ERROR conexion: {e}")
            panel._connected = False
            continue
        except Exception as e:
            print(f"  ERROR: {type(e).__name__}: {e}")
            import traceback
            if args.debug:
                traceback.print_exc()
            continue

        elapsed = time.time() - start_time
        print(f"  Total: {len(records)} registros ({elapsed:.1f}s)")

        if not records:
            continue

        print("-" * 70)

        shown = min(len(records), args.limit)
        for i, rec in enumerate(records[:shown], 1):
            if table_name == 'user':
                print(format_user(i, rec))
            elif table_name == 'transaction':
                print(format_transaction(rec))
            elif table_name == 'userauthorize':
                print(format_userauthorize(i, rec))
            else:
                print(f"  [{i:4d}] {rec}")

        if len(records) > shown:
            print(f"\n  ... ({len(records) - shown} mas, usa --limit {len(records)})")

        # Resumen
        if table_name == 'user' and records:
            groups = {}
            for rec in records:
                g = rec.get('Group', 0)
                groups[g] = groups.get(g, 0) + 1
            print(f"\n  RESUMEN: {len(records)} usuarios totales")
            for g in sorted(groups.keys()):
                print(f"    Grupo {g}: {groups[g]} usuarios")

        if table_name == 'transaction' and records:
            doors = {}
            events = {}
            for rec in records:
                d = rec.get('DoorID', '?')
                doors[d] = doors.get(d, 0) + 1
                e = rec.get('EventType', -1)
                events[e] = events.get(e, 0) + 1
            print(f"\n  RESUMEN: {len(records)} transacciones")
            print(f"  Por puerta:")
            for d in sorted(doors.keys()):
                print(f"    Puerta {d}: {doors[d]} eventos")
            print(f"  Por tipo:")
            for e in sorted(events.keys()):
                ename = EVENT_NAMES.get(e, f'Evento({e})')
                print(f"    {ename}: {events[e]}")

    # Desconectar
    try:
        panel.disconnect()
    except Exception:
        pass
    print("\n" + "=" * 70)
    print("  Desconectado OK")
    print("=" * 70)


if __name__ == '__main__':
    main()
