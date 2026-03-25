#!/usr/bin/env python3
"""
Descarga transacciones (log de accesos) del panel ZK C3-400.

La tabla transaction es muy grande y requiere manejo especial:
- Reconexion por cada campo para evitar conexiones muertas
- Two-phase transfer (DATA_RDY) para campos que no caben en un frame
- Exporta a CSV o TXT

Uso:
  python3 download_transactions.py interlomas.ddns.accessbot.net
  python3 download_transactions.py interlomas.ddns.accessbot.net --output accesos.csv
  python3 download_transactions.py interlomas.ddns.accessbot.net --limit 500
  python3 download_transactions.py interlomas.ddns.accessbot.net --debug
"""

import sys
import os
import argparse
import socket
import struct
import time
import csv
from datetime import datetime

from c3 import C3, consts, crc as c3_crc, utils


# ============================================================
# Constantes
# ============================================================
REPLY_OK = 0xC8
REPLY_ERROR = 0xC9

# Candidatos para comandos de streaming
CMD_DATA_RDY_CANDIDATES = [0x09, 0x0A, 0x0C, 0x0D]
CMD_FREE_DATA_CANDIDATES = [0x0A, 0x0C, 0x0D, 0x0E]

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

INOUT_NAMES = {0: 'Entrada', 1: 'Entrada', 2: 'N/A', 3: 'Salida', 15: '?'}


# ============================================================
# Funciones de protocolo TCP
# ============================================================
def recv_exact(sock, n, timeout=10):
    """Recibe exactamente n bytes manejando fragmentacion TCP."""
    sock.settimeout(timeout)
    data = bytearray()
    deadline = time.time() + timeout
    while len(data) < n:
        remaining = deadline - time.time()
        if remaining <= 0:
            break
        sock.settimeout(max(remaining, 0.5))
        try:
            chunk = sock.recv(n - len(data))
            if not chunk:
                break
            data.extend(chunk)
        except socket.timeout:
            if data:
                continue
            break
    return bytes(data)


def recv_c3_frame(sock, timeout=10):
    """Recibe un frame C3 completo."""
    try:
        header = recv_exact(sock, 5, timeout)
    except Exception:
        return None, b''

    if len(header) < 5 or header[0] != consts.C3_MESSAGE_START:
        return None, b''

    command = header[2]
    data_size = header[3] + (header[4] * 256)

    rest = recv_exact(sock, data_size + 3, timeout)
    payload = bytearray(rest[:data_size]) if len(rest) >= data_size else bytearray(rest)
    return command, bytes(payload)


def recv_all_available(sock, timeout=5):
    """Lee todo lo disponible en el socket."""
    data = bytearray()
    deadline = time.time() + timeout
    sock.settimeout(0.5)
    while time.time() < deadline:
        try:
            chunk = sock.recv(8192)
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
    """Receive mejorado para fragmentacion TCP."""
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


def build_c3_frame(session_id, request_nr, command, data=None):
    """Construye un frame C3 completo."""
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


def send_free_data(panel, debug=False):
    """Envia FREE_DATA para liberar buffer del panel."""
    for cmd_byte in CMD_FREE_DATA_CANDIDATES:
        frame = build_c3_frame(
            panel._session_id, panel._request_nr,
            cmd_byte, None
        )
        panel._request_nr += 1
        try:
            panel._sock.send(frame)
            cmd, payload = recv_c3_frame(panel._sock, timeout=3)
            if cmd == REPLY_OK:
                if debug:
                    print(f"    DEBUG: FREE_DATA cmd={cmd_byte:#04x} OK")
                return True
        except Exception:
            pass
    return False


# ============================================================
# Conexion
# ============================================================
def create_connection(host, timeout=15):
    """Crea una conexion fresca al panel."""
    C3._receive = patched_receive
    panel = C3(host)
    panel.receive_timeout = timeout
    panel.connect()
    return panel


def get_table_info(panel, table_name):
    """Obtiene esquema de una tabla."""
    data_cfg = panel._get_device_data_cfg()
    for cfg in data_cfg:
        if cfg.name == table_name:
            fields = [{'index': f.index, 'name': f.name, 'type': f.type}
                      for f in cfg.fields]
            return cfg.index, fields
    return None, None


# ============================================================
# Lectura two-phase por campo
# ============================================================
def read_field_twophase(panel, table_index, field, debug=False):
    """Lee un campo con soporte two-phase y estrategias multiples."""
    fidx = field['index']
    fname = field['name']

    parameters = [table_index, 1, fidx, 0, 0]

    try:
        message, msg_size = panel._send_receive(
            consts.Command.GETDATA, parameters
        )
    except Exception as e:
        if debug:
            print(f"    DEBUG: {fname}: GETDATA error: {e}")
        return None

    if not message or len(message) < 3:
        return None

    # Respuesta directa (cabe en un frame)
    if message[0] == table_index:
        return parse_field_values(message[3:], field)

    # data_stat: demasiado grande para un frame
    if message[0] == 0x00 and len(message) >= 9:
        total_size = struct.unpack_from('<I', message, 1)[0]
        if debug:
            stat2 = struct.unpack_from('<I', message, 5)[0] if len(message) >= 9 else 0
            stat3 = struct.unpack_from('<I', message, 9)[0] if len(message) >= 13 else 0
            stat4 = struct.unpack_from('<I', message, 13)[0] if len(message) >= 17 else 0
            print(f"    DEBUG: {fname}: data_stat header: "
                  f"size={total_size}, confirm={stat2}, hash={stat3}, extra={stat4}")
            print(f"    DEBUG: {fname}: data_stat hex: {message.hex(' ')}")

        session_offset = 4 if not panel._session_less else 0

        # -------------------------------------------------------
        # Estrategia 1: Esperar datos automaticos despues de data_stat
        # Algunos firmwares envian datos con delay
        # -------------------------------------------------------
        if debug:
            print(f"    DEBUG: {fname}: Estrategia 1: esperar auto-stream (15s)...")
        raw = recv_all_available(panel._sock, timeout=15)
        if raw and len(raw) > 20:
            if debug:
                print(f"    DEBUG: {fname}: auto-stream: {len(raw)} bytes")
                print(f"    DEBUG: inicio: {raw[:80].hex(' ')}")
            result = _try_parse_response(raw, table_index, field, session_offset, total_size, debug)
            if result:
                return result

        # -------------------------------------------------------
        # Estrategia 2: DATA_RDY + espera larga
        # Enviar ACK y esperar mas tiempo por datos
        # -------------------------------------------------------
        if debug:
            print(f"    DEBUG: {fname}: Estrategia 2: DATA_RDY + espera larga...")
        for data_rdy_cmd in CMD_DATA_RDY_CANDIDATES:
            size_data = struct.pack('<I', total_size)
            frame = build_c3_frame(
                panel._session_id, panel._request_nr,
                data_rdy_cmd, size_data
            )
            panel._request_nr += 1

            try:
                panel._sock.send(frame)
            except Exception:
                continue

            # Leer respuesta ACK primero
            ack_cmd, ack_resp = recv_c3_frame(panel._sock, timeout=5)
            if debug:
                print(f"    DEBUG: {fname}: DATA_RDY {data_rdy_cmd:#04x} "
                      f"ACK: cmd={ack_cmd}, {len(ack_resp)} bytes "
                      f"hex={ack_resp.hex(' ') if ack_resp else 'vacio'}")

            # Despues del ACK, esperar datos con timeout largo
            if ack_cmd is not None:
                raw = recv_all_available(panel._sock, timeout=20)
                if raw and len(raw) > 20:
                    if debug:
                        print(f"    DEBUG: {fname}: post-ACK data: {len(raw)} bytes")
                    result = _try_parse_response(raw, table_index, field, session_offset, total_size, debug)
                    if result:
                        return result
                elif debug:
                    print(f"    DEBUG: {fname}: post-ACK: sin datos extra "
                          f"({len(raw) if raw else 0})")

        # Liberar buffer antes de siguiente estrategia
        send_free_data(panel, debug)
        return None

    return None


def read_field_paginated(host, table_index, field, page_size=200, debug=False):
    """Lee un campo intentando paginacion con diferentes offsets.

    Prueba GETDATA con los trailing bytes como [offset_lo, offset_hi]
    para leer subconjuntos de registros.
    """
    fidx = field['index']
    fname = field['name']
    all_values = []
    offset = 0

    while True:
        # Conexion fresca para cada pagina
        try:
            panel = create_connection(host, timeout=15)
        except Exception as e:
            if debug:
                print(f"    DEBUG: {fname}: error conectando: {e}")
            break

        # GETDATA con offset en trailing bytes
        offset_lo = offset & 0xFF
        offset_hi = (offset >> 8) & 0xFF
        parameters = [table_index, 1, fidx, offset_lo, offset_hi]

        if debug:
            print(f"    DEBUG: {fname}: GETDATA offset={offset} "
                  f"params={parameters}")

        try:
            message, msg_size = panel._send_receive(
                consts.Command.GETDATA, parameters
            )
        except Exception as e:
            if debug:
                print(f"    DEBUG: {fname}: GETDATA error: {e}")
            try:
                panel.disconnect()
            except Exception:
                pass
            break

        if not message or len(message) < 3:
            try:
                panel.disconnect()
            except Exception:
                pass
            break

        if message[0] == table_index:
            # Respuesta directa - parsear valores
            values = parse_field_values(message[3:], field)
            if debug:
                print(f"    DEBUG: {fname}: offset={offset} -> {len(values)} valores")
            if not values:
                try:
                    panel.disconnect()
                except Exception:
                    pass
                break
            all_values.extend(values)
            offset += len(values)

            # Si obtenemos menos de lo que pediriamos, hemos terminado
            if len(values) < page_size:
                try:
                    panel.disconnect()
                except Exception:
                    pass
                break
        elif message[0] == 0x00:
            # Sigue siendo data_stat - offset no funciona como paginacion
            if debug:
                total = struct.unpack_from('<I', message, 1)[0]
                print(f"    DEBUG: {fname}: offset={offset} -> "
                      f"data_stat ({total} bytes), paginacion no soportada")
            send_free_data(panel, debug)
            try:
                panel.disconnect()
            except Exception:
                pass

            if offset == 0:
                # Si la primera pagina falla, abortar
                return None
            break
        else:
            if debug:
                print(f"    DEBUG: {fname}: respuesta inesperada byte0={message[0]:#04x}")
            try:
                panel.disconnect()
            except Exception:
                pass
            break

        try:
            panel.disconnect()
        except Exception:
            pass

    return all_values if all_values else None


def _try_parse_response(raw, table_index, field, session_offset, total_size, debug):
    """Intenta parsear datos de respuesta como field values."""
    if not raw or len(raw) < 10:
        return None

    # Si son frames C3
    if raw[0] == consts.C3_MESSAGE_START:
        all_data = parse_stream_frames(raw, total_size, session_offset, debug)
        if all_data and len(all_data) > 10:
            if len(all_data) > 3 and all_data[0] == table_index:
                values = parse_field_values(all_data[3:], field)
            else:
                values = parse_field_values(all_data, field)
            if values:
                return values
    else:
        # Datos raw sin framing
        if raw[0] == table_index and len(raw) > 3:
            values = parse_field_values(raw[3:], field)
        else:
            values = parse_field_values(raw, field)
        if values:
            return values
    return None


def parse_stream_frames(raw_data, total_size, session_offset, debug=False):
    """Parsea multiples frames C3 de un stream."""
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
        frame_end = pos + 5 + data_size + 3

        if frame_end > len(raw_data):
            # Frame incompleto - tomar lo que hay
            payload = raw_data[pos + 5:pos + 5 + data_size]
            frame_data = payload[session_offset:] if len(payload) > session_offset else payload
            if cmd == REPLY_OK and frame_data:
                all_data.extend(frame_data)
                frames += 1
            break

        payload = raw_data[pos + 5:pos + 5 + data_size]
        frame_data = payload[session_offset:] if len(payload) > session_offset else payload

        if cmd == REPLY_OK and frame_data:
            all_data.extend(frame_data)
            frames += 1

        pos = frame_end

    if debug:
        print(f"    DEBUG: stream: {frames} frames, {len(all_data)} bytes")
    return bytes(all_data[:total_size])


def parse_field_values(data, field):
    """Parsea valores de un campo desde datos binarios."""
    values = []
    pos = 0
    while pos < len(data):
        if pos >= len(data):
            break
        field_size = data[pos]
        pos += 1
        if field_size > len(data) - pos or field_size > 200:
            break
        raw = data[pos:pos + field_size]
        if field['type'] == 'i':
            values.append(int.from_bytes(raw, 'little') if raw else 0)
        else:
            values.append(raw.decode('ascii', errors='ignore').rstrip('\x00'))
        pos += field_size
    return values


# ============================================================
# Decodificacion de campos
# ============================================================
def decode_time_second(value):
    """Decodifica Time_second del panel C3.

    El C3-400 puede usar diferentes formatos:
    - Unix timestamp (segundos desde epoch)
    - Formato C3: ((Y-2000)*12*31+(M-1)*31+(D-1))*86400+H*3600+M*60+S
    - Formato YYYYMMDDHHMMSS como entero
    """
    if not value or value <= 0:
        return "2000-01-01 00:00:00"

    # Si es un timestamp Unix razonable (2000-2030)
    if 946684800 <= value <= 1893456000:
        try:
            return datetime.fromtimestamp(value).strftime("%Y-%m-%d %H:%M:%S")
        except Exception:
            pass

    # Formula C3 (valores grandes tipicos de C3-400 firmware v18+)
    import math
    if value > 30000000:
        try:
            year = math.floor(value / 32140800) + 2000
            month = math.floor(value / 2678400) % 12 + 1
            day = math.floor(value / 86400) % 31 + 1
            hour = math.floor(value / 3600) % 24
            minute = math.floor(value / 60) % 60
            second = value % 60
            if 2000 <= year <= 2099 and 1 <= month <= 12 and 1 <= day <= 31:
                return f"{year:04d}-{month:02d}-{day:02d} {hour:02d}:{minute:02d}:{second:02d}"
        except Exception:
            pass

    # Formato YYYYMMDD (sin hora)
    if 20000101 <= value <= 20991231:
        year = value // 10000
        month = (value // 100) % 100
        day = value % 100
        if 1 <= month <= 12 and 1 <= day <= 31:
            return f"{year:04d}-{month:02d}-{day:02d} 00:00:00"

    return str(value)


# ============================================================
# Descarga principal
# ============================================================
def download_transactions(host, debug=False, timeout=15):
    """Descarga transacciones con multiples estrategias."""

    print(f"  Conectando a {host}...")
    panel = create_connection(host, timeout)
    print(f"  Conectado - Serial: {panel.serial_number}")
    print(f"  Firmware: {panel.firmware_version}")

    table_index, fields = get_table_info(panel, 'transaction')
    if not fields:
        print("  ERROR: No se encontro tabla transaction")
        panel.disconnect()
        return []

    print(f"  Tabla transaction (idx={table_index})")
    print(f"  Campos: {', '.join(f['name'] for f in fields)}")
    print()

    # ============================================================
    # Estrategia 1: Two-phase con reconexion por campo
    # ============================================================
    print("  --- Estrategia 1: Two-phase con reconexion ---")
    all_field_values = {}
    record_count = None
    strategy1_failed = False

    for field in fields:
        fname = field['name']
        print(f"  [{fname}]", end=' ', flush=True)

        try:
            panel.disconnect()
        except Exception:
            pass

        try:
            panel = create_connection(host, timeout)
        except Exception as e:
            print(f"ERROR reconectando: {e}")
            time.sleep(2)
            try:
                panel = create_connection(host, timeout)
            except Exception:
                print(f"FALLO")
                strategy1_failed = True
                continue

        values = read_field_twophase(panel, table_index, field, debug)

        if values:
            all_field_values[fname] = values
            if record_count is None:
                record_count = len(values)
            print(f"{len(values)} registros OK")
        else:
            print(f"FALLO")
            strategy1_failed = True
            # Seguir intentando otros campos - quizas algunos funcionan
            continue

    try:
        panel.disconnect()
    except Exception:
        pass

    # Si estrategia 1 no obtuvo nada, intentar paginacion
    if not all_field_values or record_count is None:
        # ============================================================
        # Estrategia 2: GETDATA paginado con offset en trailing bytes
        # ============================================================
        print("\n  --- Estrategia 2: GETDATA paginado ---")
        all_field_values = {}
        record_count = None

        for field in fields:
            fname = field['name']
            print(f"  [{fname}]", end=' ', flush=True)

            values = read_field_paginated(
                host, table_index, field,
                page_size=200, debug=debug
            )

            if values:
                all_field_values[fname] = values
                if record_count is None:
                    record_count = len(values)
                print(f"{len(values)} registros OK")
            else:
                print(f"FALLO")
                # Si primer campo con paginacion falla, abortar esta estrategia
                if not all_field_values:
                    print("  Paginacion no soportada por este firmware.")
                    break

    if not all_field_values or record_count is None:
        print("\n  No se pudo leer ningun campo con ninguna estrategia.")
        return []

    # Reconstruir registros
    records = []
    for i in range(record_count):
        rec = {}
        for field in fields:
            fname = field['name']
            if fname in all_field_values:
                vals = all_field_values[fname]
                if i < len(vals):
                    rec[fname] = vals[i]
        if rec:
            records.append(rec)

    # Decodificar campos
    for rec in records:
        if 'Time_second' in rec:
            raw_ts = rec['Time_second']
            rec['Fecha'] = decode_time_second(raw_ts)
            rec['Time_second_raw'] = raw_ts
        if 'EventType' in rec:
            rec['Evento'] = EVENT_NAMES.get(rec['EventType'], f"Evento({rec['EventType']})")
        if 'InOutState' in rec:
            rec['Direccion'] = INOUT_NAMES.get(rec['InOutState'], f"Dir({rec['InOutState']})")

    return records


def export_csv(records, filename):
    """Exporta registros a CSV."""
    if not records:
        print("  No hay registros para exportar.")
        return

    # Columnas en orden logico
    columns = ['Fecha', 'Cardno', 'Pin', 'DoorID', 'Evento', 'EventType',
               'Direccion', 'InOutState', 'Time_second_raw']
    # Agregar columnas extra que puedan existir
    for rec in records[:1]:
        for k in rec:
            if k not in columns:
                columns.append(k)

    # Solo incluir columnas que existan en los datos
    available = [c for c in columns if any(c in r for r in records)]

    with open(filename, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=available, extrasaction='ignore')
        writer.writeheader()
        writer.writerows(records)

    print(f"  Exportado: {filename} ({len(records)} registros)")


def export_txt(records, filename):
    """Exporta registros a TXT legible."""
    if not records:
        return

    with open(filename, 'w', encoding='utf-8') as f:
        f.write(f"REGISTRO DE ACCESOS - Panel ZK C3-400\n")
        f.write(f"Descargado: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(f"Total registros: {len(records)}\n")
        f.write("=" * 100 + "\n\n")

        for i, rec in enumerate(records, 1):
            fecha = rec.get('Fecha', '?')
            card = str(rec.get('Cardno', '?'))
            pin = str(rec.get('Pin', '?'))
            door = rec.get('DoorID', '?')
            evento = rec.get('Evento', '?')
            direccion = rec.get('Direccion', '?')

            f.write(f"[{i:>5}] {fecha}  P{door}  "
                    f"Tarjeta:{card:>12}  PIN:{pin:>10}  "
                    f"{evento:<28}  {direccion}\n")

    print(f"  Exportado: {filename} ({len(records)} registros)")


def print_summary(records):
    """Muestra resumen de los registros."""
    if not records:
        return

    print(f"\n  RESUMEN: {len(records)} transacciones")
    print("  " + "-" * 50)

    # Por puerta
    doors = {}
    for r in records:
        d = r.get('DoorID', '?')
        doors[d] = doors.get(d, 0) + 1
    for d in sorted(doors.keys()):
        print(f"    Puerta {d}: {doors[d]} eventos")

    # Por tipo de evento
    events = {}
    for r in records:
        e = r.get('Evento', r.get('EventType', '?'))
        events[e] = events.get(e, 0) + 1
    print()
    for e, count in sorted(events.items(), key=lambda x: -x[1]):
        print(f"    {e}: {count}")

    # Rango de fechas
    fechas = [r.get('Fecha', '') for r in records if r.get('Fecha')]
    valid_fechas = [f for f in fechas if f > '2000-01-02']
    if valid_fechas:
        print(f"\n    Rango: {min(valid_fechas)} a {max(valid_fechas)}")


# ============================================================
# Main
# ============================================================
def main():
    parser = argparse.ArgumentParser(
        description='Descarga transacciones del panel ZK C3-400',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Ejemplos:
  python3 download_transactions.py interlomas.ddns.accessbot.net
  python3 download_transactions.py interlomas.ddns.accessbot.net --output accesos.csv
  python3 download_transactions.py interlomas.ddns.accessbot.net --format txt
  python3 download_transactions.py interlomas.ddns.accessbot.net --limit 100
  python3 download_transactions.py interlomas.ddns.accessbot.net --debug
        """)

    parser.add_argument('host', help='IP o hostname del panel')
    parser.add_argument('--output', '-o', default=None,
                        help='Archivo de salida (auto: transacciones_YYYYMMDD.csv)')
    parser.add_argument('--format', '-f', choices=['csv', 'txt'], default='csv',
                        help='Formato de salida (default: csv)')
    parser.add_argument('--limit', '-l', type=int, default=0,
                        help='Mostrar solo ultimos N registros (0=todos)')
    parser.add_argument('--debug', action='store_true',
                        help='Mostrar informacion de debug')
    parser.add_argument('--timeout', type=int, default=15,
                        help='Timeout TCP en segundos (default: 15)')
    args = parser.parse_args()

    print("=" * 70)
    print("  ZK C3-400 - Descarga de Transacciones")
    print(f"  Host: {args.host}")
    print(f"  Fecha: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 70)
    print()

    start_time = time.time()
    records = download_transactions(args.host, args.debug, args.timeout)
    elapsed = time.time() - start_time

    if not records:
        print("\n  No se obtuvieron registros.")
        print("  La tabla transaction puede requerir acceso via software ZKAccess.")
        sys.exit(1)

    print(f"\n  Descargados: {len(records)} registros en {elapsed:.1f}s")

    # Limitar si se pidio
    if args.limit and len(records) > args.limit:
        records = records[-args.limit:]
        print(f"  Mostrando ultimos {args.limit}")

    # Mostrar preview
    print("\n  ULTIMOS 10 REGISTROS:")
    print("  " + "-" * 90)
    for rec in records[-10:]:
        fecha = rec.get('Fecha', '?')
        card = str(rec.get('Cardno', '?'))
        door = rec.get('DoorID', '?')
        evento = rec.get('Evento', '?')
        print(f"  {fecha}  P{door}  Tarjeta:{card:>12}  {evento}")

    print_summary(records)

    # Exportar
    if args.output:
        filename = args.output
    else:
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        ext = args.format
        filename = f"transacciones_{timestamp}.{ext}"

    if args.format == 'txt':
        export_txt(records, filename)
    else:
        export_csv(records, filename)

    print()
    print("=" * 70)
    print(f"  Completado: {filename}")
    print("=" * 70)


if __name__ == '__main__':
    main()
