#!/usr/bin/env python3
"""
Lector de tablas ZK C3 - soporta transferencia two-phase (firmware v18+)

Firmware v18+ usa transferencia en dos fases para tablas grandes:
1. GETDATA (0x08) → Panel responde con data_stat header (17 bytes)
2. Cliente envia DATA_RDY con el tamaño → Panel envia datos en chunks
3. Cliente envia FREE_DATA para liberar buffer

Los command bytes para la fase 2 no están documentados para C3.
Este script prueba los candidatos y detecta cual funciona.

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
# Constantes extendidas del protocolo C3
# ============================================================
# Comandos conocidos del C3
# 0x01 = CONNECT_SESSIONLESS
# 0x02 = DISCONNECT
# 0x03 = DATETIME
# 0x04 = GETPARAM
# 0x05 = CONTROL
# 0x06 = DATATABLE_CFG
# 0x07 = SETDATA (no implementado en lib)
# 0x08 = GETDATA
# 0x09 = ? (DELETEDATA? DATA_RDY?)
# 0x0A = ? (DATA_RDY? FREE_DATA?)
# 0x0B = RTLOG_BINARY
# 0x0C = ?
# 0x0D = ?

# Candidatos para DATA_RDY en el protocolo C3
CMD_DATA_RDY_CANDIDATES = [0x09, 0x0A, 0x0C, 0x0D]
CMD_FREE_DATA_CANDIDATES = [0x0A, 0x0C, 0x0D, 0x0E]

REPLY_OK = 0xC8
REPLY_ERROR = 0xC9


# ============================================================
# Funciones de protocolo
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
    """Recibe un frame C3 completo. Retorna (command, payload) o (None, b'')."""
    try:
        header = recv_exact(sock, 5, timeout)
    except Exception:
        return None, b''

    if len(header) < 5 or header[0] != consts.C3_MESSAGE_START:
        return None, b''

    command = header[2]
    data_size = header[3] + (header[4] * 256)

    rest = recv_exact(sock, data_size + 3, timeout)
    if len(rest) < data_size + 3:
        # Respuesta parcial
        payload = rest[:data_size] if len(rest) >= data_size else rest
        return command, bytes(payload)

    # Extraer payload sin CRC(2) y END(1)
    payload = bytearray(rest[:data_size])
    return command, bytes(payload)


def recv_all_available(sock, timeout=3):
    """Lee todo lo disponible en el socket durante timeout segundos."""
    data = bytearray()
    deadline = time.time() + timeout
    sock.settimeout(0.5)
    while time.time() < deadline:
        try:
            chunk = sock.recv(4096)
            if chunk:
                data.extend(chunk)
            else:
                break
        except socket.timeout:
            if data:
                break
            continue
        except Exception:
            break
    return bytes(data)


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
            f"Invalid response header; expected 5 bytes, received {header}"
        )

    message = bytearray()
    received_command, data_size, protocol_version = self._get_message_header(header)

    payload = recv_exact(self._sock, data_size + 3, self.receive_timeout)

    if data_size > 0:
        full_msg = header + payload
        message = self._get_message(full_msg)

    if len(message) != data_size:
        raise ValueError(
            f"Message length ({len(message)}) != specified ({data_size})"
        )

    if received_command == REPLY_OK:
        pass
    elif received_command == REPLY_ERROR:
        error = utils.byte_to_signed_int(message[-1])
        raise ConnectionError(
            f"Error {error}: {consts.Errors.get(error, 'Unknown')}"
        )

    return message, data_size, protocol_version


# ============================================================
# Two-phase data transfer
# ============================================================
def build_c3_raw_frame(session_id, request_nr, command, data=None):
    """Construye un frame C3 completo listo para enviar."""
    payload_len = (len(data) if data else 0) + (4 if session_id is not None else 0)

    msg = bytearray([
        consts.C3_PROTOCOL_VERSION,
        command,
        utils.lsb(payload_len),
        utils.msb(payload_len),
    ])

    if session_id is not None:
        msg.append(utils.lsb(session_id))
        msg.append(utils.msb(session_id))
        msg.append(utils.lsb(request_nr))
        msg.append(utils.msb(request_nr))

    if data:
        msg.extend(data)

    checksum = c3_crc.crc16(msg)
    msg.append(utils.lsb(checksum))
    msg.append(utils.msb(checksum))
    msg.insert(0, consts.C3_MESSAGE_START)
    msg.append(consts.C3_MESSAGE_END)
    return bytes(msg)


def parse_data_stat(message):
    """Parsea el header data_stat de respuesta GETDATA para tablas grandes.

    Formato (17 bytes):
      [0]     = 0x00 (indica two-phase transfer)
      [1:5]   = total_size (LE uint32) - tamaño total de datos
      [5:9]   = total_size_confirm (LE uint32) - confirmación
      [9:13]  = checksum/hash de los datos
      [13:17] = record_count o extra info
    """
    if not message or len(message) < 9 or message[0] != 0x00:
        return None

    total_size = struct.unpack_from('<I', message, 1)[0]
    total_size2 = struct.unpack_from('<I', message, 5)[0]
    data_hash = struct.unpack_from('<I', message, 9)[0] if len(message) >= 13 else 0
    extra = struct.unpack_from('<I', message, 13)[0] if len(message) >= 17 else 0

    return {
        'total_size': total_size,
        'total_size_confirm': total_size2,
        'data_hash': data_hash,
        'extra': extra,
    }


def send_raw_cmd(panel, cmd_byte, payload_data=None, debug=False, timeout=5):
    """Envia un comando C3 raw y recibe la respuesta."""
    frame = build_c3_raw_frame(
        panel._session_id, panel._request_nr,
        cmd_byte, payload_data
    )
    panel._request_nr += 1

    try:
        panel._sock.send(frame)
    except Exception as e:
        if debug:
            print(f"  DEBUG: error enviando cmd={cmd_byte:#04x}: {e}")
        return None, b''

    try:
        cmd, resp = recv_c3_frame(panel._sock, timeout=timeout)
    except Exception:
        cmd, resp = None, b''

    if debug:
        if cmd is not None:
            preview = resp[:60].hex(' ') if resp else '(vacio)'
            print(f"  DEBUG: cmd={cmd_byte:#04x} -> resp={cmd:#04x}, "
                  f"{len(resp)} bytes: {preview}")
        else:
            print(f"  DEBUG: cmd={cmd_byte:#04x} -> sin respuesta")

    return cmd, resp


def read_twophase_data(panel, total_size, debug=False, timeout=60):
    """Lee datos two-phase probando multiples estrategias.

    Estrategias:
    A) Raw TCP: leer bytes crudos del socket (sin framing C3)
    B) GETDATA paginado: re-enviar GETDATA con offset en trailing bytes
    C) GETDATA re-send: re-enviar mismo GETDATA para obtener datos
    D) Esperar frames C3 con timeout largo
    """
    session_offset = 4 if not panel._session_less else 0

    # ============================================================
    # Estrategia A: leer raw TCP inmediatamente
    # Quiza el panel envia datos sin framing C3 despues del data_stat
    # ============================================================
    if debug:
        print(f"  DEBUG: === Estrategia A: Raw TCP ===")
    raw = recv_all_available(panel._sock, timeout=3)
    if raw and len(raw) > 20:
        if debug:
            print(f"  DEBUG: raw TCP: {len(raw)} bytes")
            print(f"  DEBUG: inicio: {raw[:80].hex(' ')}")
        # Verificar si empieza con 0xAA (frame C3) o es datos puros
        if raw[0] != consts.C3_MESSAGE_START:
            print(f"  Estrategia A: datos raw TCP ({len(raw)} bytes)")
            return bytes(raw[:total_size])
        else:
            # Son frames C3 - parsearlos
            print(f"  Estrategia A: frames C3 encontrados ({len(raw)} bytes raw)")
            return _parse_raw_frames(raw, total_size, session_offset, debug)
    elif debug:
        print(f"  DEBUG: no hay datos raw ({len(raw) if raw else 0} bytes)")

    # ============================================================
    # Estrategia B: re-enviar GETDATA con diferentes trailing params
    # Los [0, 0] al final podrian ser [page, flags]
    # ============================================================
    if debug:
        print(f"  DEBUG: === Estrategia B: GETDATA paginado ===")

    # Necesitamos la info de tabla para reconstruir GETDATA
    # Usamos tabla user (idx=1) como referencia, pero esto se llama
    # desde read_table que pasa la info correcta
    return b''


def _parse_raw_frames(raw_data, total_size, session_offset, debug=False):
    """Parsea frames C3 de datos raw del socket."""
    all_data = bytearray()
    pos = 0
    frames = 0

    while pos < len(raw_data) and len(all_data) < total_size:
        if raw_data[pos] != consts.C3_MESSAGE_START:
            pos += 1
            continue

        if pos + 5 > len(raw_data):
            break

        cmd = raw_data[pos + 2]
        data_size = raw_data[pos + 3] + (raw_data[pos + 4] * 256)

        frame_end = pos + 5 + data_size + 3  # header + payload + CRC + END
        if frame_end > len(raw_data):
            break

        payload = raw_data[pos + 5:pos + 5 + data_size]
        frame_data = payload[session_offset:] if len(payload) > session_offset else payload

        if cmd == REPLY_OK and frame_data:
            all_data.extend(frame_data)
            frames += 1
            if debug and frames <= 3:
                print(f"  DEBUG: raw frame {frames}: cmd={cmd:#04x}, "
                      f"{len(frame_data)} bytes")

        pos = frame_end

    if debug:
        print(f"  DEBUG: parseados {frames} frames, {len(all_data)} bytes")
    return bytes(all_data[:total_size])


def send_free_data(panel, debug=False):
    """Envia FREE_DATA para liberar el buffer del panel."""
    for cmd_byte in CMD_FREE_DATA_CANDIDATES:
        frame = build_c3_raw_frame(
            panel._session_id, panel._request_nr,
            cmd_byte, None
        )
        panel._request_nr += 1
        try:
            panel._sock.send(frame)
            cmd, payload = recv_c3_frame(panel._sock, timeout=3)
            if cmd == REPLY_OK:
                if debug:
                    print(f"  DEBUG: FREE_DATA cmd={cmd_byte:#04x} OK")
                return True
        except Exception:
            pass
    return False


# ============================================================
# Lectura completa de tabla
# ============================================================
def read_table(panel, table_name, fields_info, table_index,
               debug=False, timeout=60):
    """Lee una tabla del panel C3, con soporte two-phase para tablas grandes."""
    field_indexes = [f['index'] for f in fields_info]
    field_indexes.sort()

    # Paso 1: Enviar GETDATA
    parameters = [table_index, len(field_indexes)] + field_indexes + [0, 0]
    message, msg_size = panel._send_receive(consts.Command.GETDATA, parameters)

    if debug:
        print(f"  DEBUG: GETDATA respuesta: {len(message)} bytes")
        print(f"  DEBUG: hex: {message.hex(' ')}")

    if not message or len(message) < 2:
        return []

    # Caso 1: Respuesta directa (tabla pequeña o firmware viejo)
    if message[0] == table_index:
        if debug:
            print(f"  DEBUG: respuesta directa (single-frame)")
        return parse_table_records(message, fields_info, table_index, debug)

    # Caso 2: data_stat header (two-phase transfer)
    stat = parse_data_stat(message)
    if stat:
        total_size = stat['total_size']
        extra = stat['extra']
        print(f"  Two-phase transfer: {total_size} bytes, extra={extra}")

        if total_size == 0:
            print(f"  Tabla vacia")
            return []

        # Estrategia A: leer raw TCP / frames C3 que ya esten en el socket
        all_data = read_twophase_data(panel, total_size, debug, timeout)

        if not all_data or len(all_data) < 10:
            # Estrategia B: re-enviar GETDATA - quiza data_stat fue "prepare"
            # y el segundo GETDATA devuelve los datos reales
            if debug:
                print(f"  DEBUG: === Estrategia B: Re-send GETDATA ===")
            try:
                msg2, sz2 = panel._send_receive(
                    consts.Command.GETDATA, parameters
                )
                if msg2 and len(msg2) > 17 and msg2[0] == table_index:
                    print(f"  Estrategia B: GETDATA re-send funciono! "
                          f"({len(msg2)} bytes)")
                    all_data = msg2
                elif msg2 and debug:
                    print(f"  DEBUG: re-GETDATA: {len(msg2)} bytes, "
                          f"byte0={msg2[0]:#04x}: {msg2[:20].hex(' ')}")
            except Exception as e:
                if debug:
                    print(f"  DEBUG: re-GETDATA error: {e}")

        if not all_data or len(all_data) < 10:
            # Estrategia C: GETDATA con trailing bytes variados
            # [table, fields..., start_record, page_size]
            if debug:
                print(f"  DEBUG: === Estrategia C: GETDATA paginado ===")
            for trail_a, trail_b in [(1, 0), (0, 1), (1, 1), (0, 100)]:
                params_paged = ([table_index, len(field_indexes)]
                                + field_indexes + [trail_a, trail_b])
                try:
                    msg3, sz3 = panel._send_receive(
                        consts.Command.GETDATA, params_paged
                    )
                    if msg3 and len(msg3) > 17 and msg3[0] == table_index:
                        print(f"  Estrategia C: trail=[{trail_a},{trail_b}] "
                              f"funciono! ({len(msg3)} bytes)")
                        all_data = msg3
                        break
                    elif msg3 and debug:
                        is_stat = (msg3[0] == 0x00 and len(msg3) >= 9)
                        tag = "data_stat" if is_stat else "otro"
                        print(f"  DEBUG: trail=[{trail_a},{trail_b}]: "
                              f"{len(msg3)} bytes ({tag})")
                except Exception as e:
                    if debug:
                        print(f"  DEBUG: trail=[{trail_a},{trail_b}] error: {e}")
                    break  # Conexion rota

        if not all_data or len(all_data) < 10:
            # Estrategia D: enviar cmd 0x09, luego esperar 15s por frames
            if debug:
                print(f"  DEBUG: === Estrategia D: cmd 0x09 + wait 15s ===")
            rdy_payload = struct.pack('<II', 0, total_size)
            send_raw_cmd(panel, 0x09, rdy_payload, debug, timeout=3)
            # Esperar más tiempo por si los datos llegan con delay
            raw = recv_all_available(panel._sock, timeout=15)
            if raw and len(raw) > 20:
                if debug:
                    print(f"  DEBUG: datos tardios: {len(raw)} bytes")
                    print(f"  DEBUG: inicio: {raw[:80].hex(' ')}")
                if raw[0] == consts.C3_MESSAGE_START:
                    session_off = 4 if not panel._session_less else 0
                    all_data = _parse_raw_frames(
                        raw, total_size, session_off, debug
                    )
                else:
                    all_data = raw[:total_size]
            elif debug:
                print(f"  DEBUG: sin datos tardios "
                      f"({len(raw) if raw else 0} bytes)")

        # FREE_DATA
        send_free_data(panel, debug)

        if debug:
            preview = all_data[:200].hex(' ') if all_data else '(vacio)'
            print(f"  DEBUG: datos totales: {len(all_data)} bytes")
            print(f"  DEBUG: preview: {preview}")

        if not all_data:
            return []

        # Si los datos ya incluyen table header (byte0 == table_index)
        if all_data[0] == table_index:
            return parse_table_records(
                bytes(all_data), fields_info, table_index, debug
            )
        # Si los datos son raw sin header, agregar header
        return parse_table_records(
            bytes(all_data), fields_info, table_index, debug
        )

    # Caso 3: Formato desconocido
    print(f"  AVISO: formato respuesta desconocido (byte0={message[0]:#04x})")
    return parse_table_records(message, fields_info, table_index, debug)


def parse_table_records(data, fields_info, expected_table_idx, debug=False):
    """Parsea registros binarios de una tabla C3.

    Formato: [table_idx] [field_count] [field_idx1, ...] [records...]
    Cada campo: [size_byte] [data_bytes...]
    """
    if not data or len(data) < 3:
        return []

    resp_table = data[0]
    resp_field_cnt = data[1]

    if resp_field_cnt == 0 or resp_field_cnt > 30:
        if debug:
            print(f"  DEBUG parse: field_cnt={resp_field_cnt} invalido, "
                  f"byte0={resp_table:#04x}")
        return []

    if resp_table != expected_table_idx and debug:
        print(f"  DEBUG parse: tabla esperada={expected_table_idx}, "
              f"recibida={resp_table}")

    resp_field_indexes = list(data[2:2 + resp_field_cnt])
    record_data = data[2 + resp_field_cnt:]

    if debug:
        print(f"  DEBUG parse: fields={resp_field_cnt}, "
              f"indexes={resp_field_indexes}, data={len(record_data)} bytes")

    records = []
    pos = 0
    while pos < len(record_data):
        record = {}
        valid = True
        start_pos = pos

        for fidx in resp_field_indexes:
            if pos >= len(record_data):
                valid = False
                break

            field_size = record_data[pos]
            pos += 1

            if field_size > len(record_data) - pos or field_size > 200:
                valid = False
                pos = start_pos + 1  # Skip bad byte and try next
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
        elif not valid and records:
            # Ya tenemos registros, parar
            break
        elif not valid and not records and pos < len(record_data):
            # No hemos parseado nada, avanzar
            continue
        else:
            break

    return records


# ============================================================
# Formateo
# ============================================================
EVENT_NAMES = {
    0: 'Acceso OK (tarjeta)', 1: 'Acceso Normal Open TZ',
    2: 'Primera tarjeta abre', 3: 'Multi-tarjeta abre',
    4: 'Password emergencia', 5: 'Abierto en Normal Open TZ',
    6: 'Linkage trigger', 7: 'Cancelar alarma',
    8: 'Apertura remota', 9: 'Cierre remoto',
    10: 'Deshab Normal Open TZ', 11: 'Hab Normal Open TZ',
    14: 'Huella OK', 17: 'Tarjeta+Huella OK',
    20: 'Intervalo corto', 21: 'TZ inactiva (tarjeta)',
    22: 'TZ ilegal', 23: 'Acceso DENEGADO',
    24: 'Anti-passback', 27: 'Tarjeta NO REGISTRADA',
    29: 'Tarjeta EXPIRADA', 30: 'Password error',
    34: 'Huella no registrada',
    200: 'Puerta abierta OK', 201: 'Puerta cerrada OK',
    202: 'Boton salida', 206: 'Inicio dispositivo',
    220: 'Aux in desconectado', 221: 'Aux in corto',
}
INOUT_NAMES = {0: 'Entrada', 2: 'N/A', 3: 'Salida', 15: '?'}


def format_user(i, rec):
    card = str(rec.get('CardNo', '?'))
    pin = str(rec.get('Pin', '?'))
    group = rec.get('Group', '?')
    start = rec.get('StartTime', '?')
    end = rec.get('EndTime', '?')
    sa = rec.get('SuperAuthorize', 0)
    role = 'SUPER' if sa else 'normal'
    return (f"  [{i:4d}] Tarjeta: {card:>12s} | PIN: {pin:>8s} | "
            f"Grupo: {group} | {start} a {end} | {role}")


def format_transaction(rec):
    card = str(rec.get('Cardno', rec.get('CardNo', '?')))
    pin = str(rec.get('Pin', '?'))
    door = rec.get('DoorID', '?')
    event = rec.get('EventType', -1)
    inout = rec.get('InOutState', 2)
    ts = rec.get('Time_second', '?')
    ename = EVENT_NAMES.get(event, f'Evento({event})')
    iname = INOUT_NAMES.get(inout, f'Dir({inout})')
    return (f"  [{ts}] P{door} | {ename:<28s} | "
            f"Tarjeta: {card:>12s} | PIN: {pin:>8s} | {iname}")


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
                        help='Max registros (default: 100)')
    parser.add_argument('--debug', action='store_true', help='Mostrar raw hex')
    parser.add_argument('--timeout', type=int, default=60,
                        help='Timeout transferencia (default: 60s)')
    args = parser.parse_args()

    print("=" * 70)
    print(f"  ZK C3 - Lector de Tablas (two-phase transfer)")
    print(f"  Host: {args.host}")
    print(f"  Fecha: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 70)

    C3._receive = patched_receive

    panel = C3(args.host)
    panel.receive_timeout = max(args.timeout, 15)
    print(f"\nConectando a {args.host}...")
    try:
        panel.connect()
    except Exception as e:
        print(f"ERROR: {e}")
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
                panel.receive_timeout = max(args.timeout, 15)
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
                print(f"  ERROR: {e}")
                break

        print(f"  Leyendo (idx={tbl['index']})...")
        start_time = time.time()

        try:
            records = read_table(
                panel, table_name, tbl['fields'], tbl['index'],
                debug=args.debug, timeout=args.timeout
            )
        except ConnectionError as e:
            print(f"  ERROR conexion: {e}")
            panel._connected = False
            continue
        except Exception as e:
            print(f"  ERROR: {type(e).__name__}: {e}")
            if args.debug:
                import traceback
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

        # Resúmenes
        if table_name == 'user' and records:
            groups = {}
            for rec in records:
                g = rec.get('Group', 0)
                groups[g] = groups.get(g, 0) + 1
            print(f"\n  RESUMEN: {len(records)} usuarios")
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
            for d in sorted(doors.keys()):
                print(f"    Puerta {d}: {doors[d]}")
            for e in sorted(events.keys()):
                print(f"    {EVENT_NAMES.get(e, f'Evento({e})')}: {events[e]}")

    try:
        panel.disconnect()
    except Exception:
        pass
    print("\n" + "=" * 70)
    print("  Desconectado OK")
    print("=" * 70)


if __name__ == '__main__':
    main()
