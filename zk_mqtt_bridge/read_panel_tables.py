#!/usr/bin/env python3
"""
Lector de tablas ZK C3 - usa la libreria c3 con workarounds para tablas grandes

La libreria c3 falla con tablas grandes porque:
1. recv() no maneja fragmentacion TCP
2. Algunos paneles responden con table_index diferente al esperado
3. Tablas con muchos registros necesitan mayor timeout

Este script usa la conexion de la libreria pero parsea las respuestas con tolerancia.

Uso:
  python3 read_panel_tables.py interlomas.ddns.accessbot.net
  python3 read_panel_tables.py interlomas.ddns.accessbot.net --table user
  python3 read_panel_tables.py interlomas.ddns.accessbot.net --table transaction --limit 50
  python3 read_panel_tables.py interlomas.ddns.accessbot.net --debug
"""

import sys
import argparse
import socket
import time
from datetime import datetime
from c3 import C3
from c3 import consts


# ============================================================
# Monkey-patch para mejorar recv de la libreria c3
# ============================================================
def patched_receive(self):
    """Receive mejorado que maneja fragmentacion TCP."""
    self._sock.settimeout(self.receive_timeout)

    # Leer header (5 bytes) con reintentos
    header = bytes()
    for _ in range(self.receive_retries):
        try:
            header = _recv_exact(self._sock, 5, self.receive_timeout)
            if len(header) == 5:
                break
        except socket.timeout:
            pass

    if len(header) != 5:
        raise ConnectionError(
            f"Invalid response header received; expected 5 bytes, received {header}"
        )

    self.log.debug("Received header: %s", header.hex())

    message = bytearray()
    received_command, data_size, protocol_version = self._get_message_header(header)

    # Leer payload + CRC(2) + END(1) con recv_exact
    remaining = data_size + 3
    payload = _recv_exact(self._sock, remaining, self.receive_timeout)

    if data_size > 0:
        self.log.debug("Receiving payload (data size %d): %s", data_size, payload.hex())
        full_msg = header + payload
        message = self._get_message(full_msg)

    if len(message) != data_size:
        raise ValueError(
            f"Length of received message ({len(message)}) doesn't match specified ({data_size})"
        )

    if received_command == consts.C3_REPLY_OK:
        pass
    elif received_command == consts.C3_REPLY_ERROR:
        from c3 import utils
        error = utils.byte_to_signed_int(message[-1])
        raise ConnectionError(
            f"Error {error} received in reply: {consts.Errors.get(error, 'Unknown')}"
        )

    return message, data_size, protocol_version


def _recv_exact(sock, n, timeout=10):
    """Recibe exactamente n bytes manejando fragmentacion TCP."""
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
                # Tenemos datos parciales, esperar un poco mas
                continue
            break
    return bytes(data)


# ============================================================
# Lectura tolerante de tablas
# ============================================================
def read_table_tolerant(panel, table_name, fields_info, table_index, debug=False):
    """Lee una tabla usando _send_receive de la libreria, pero con parseo tolerante."""
    field_indexes = [f['index'] for f in fields_info]
    field_indexes.sort()

    # Parametros GETDATA: [table_index, num_fields, field1, field2, ..., 0, 0]
    parameters = [table_index, len(field_indexes)] + field_indexes + [0, 0]

    message, msg_size = panel._send_receive(consts.Command.GETDATA, parameters)

    if debug:
        hex_dump = message[:200].hex(' ') if message else '(vacio)'
        print(f"  DEBUG raw ({len(message)} bytes): {hex_dump}")
        if len(message) > 200:
            print(f"  ... ({len(message) - 200} bytes mas)")

    if not message or len(message) < 2:
        return []

    resp_table = message[0]
    resp_field_cnt = message[1]

    # Tolerancia: si el panel responde con index diferente
    if resp_table != table_index:
        if debug:
            print(f"  DEBUG: tabla esperada={table_index}, recibida={resp_table}")
        # Si responde 0 o el field count parece razonable, intentar parsear
        if resp_field_cnt == 0 or resp_field_cnt > 20:
            return []

    resp_field_indexes = list(message[2:2 + resp_field_cnt])
    data = message[2 + resp_field_cnt:]

    if debug:
        print(f"  DEBUG: resp_table={resp_table}, field_cnt={resp_field_cnt}, "
              f"field_idxs={resp_field_indexes}, data_len={len(data)}")

    records = []
    while data and len(data) > 1:
        record = {}
        valid = True

        for fidx in resp_field_indexes:
            if not data:
                valid = False
                break

            field_size = data[0]
            if field_size > len(data) - 1 or field_size > 200:
                valid = False
                break

            field_info = next((f for f in fields_info if f['index'] == fidx), None)
            if field_info:
                raw = data[1:1 + field_size]
                if field_info['type'] == 'i':
                    record[field_info['name']] = int.from_bytes(raw, 'little') if raw else 0
                else:
                    record[field_info['name']] = raw.decode('ascii', errors='ignore').rstrip('\x00')
            data = data[1 + field_size:]

        if valid and record:
            records.append(record)
        elif not valid:
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
    # Formatear card como string
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
    parser.add_argument('--timeout', type=int, default=15,
                        help='Timeout de recepcion (default: 15s)')
    args = parser.parse_args()

    print("=" * 70)
    print(f"  ZK C3 - Lector de Tablas")
    print(f"  Host: {args.host}")
    print(f"  Fecha: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 70)

    # Aplicar monkey-patch para mejorar recv
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

    # Info basica
    print(f"  Serial:   {panel.serial_number}")
    print(f"  Firmware: {panel.firmware_version}")
    print(f"  Puertas:  {panel.nr_of_locks}")

    # Obtener config de tablas
    print("\n" + "-" * 70)
    print("  TABLAS DISPONIBLES")
    print("-" * 70)

    try:
        data_cfg = panel._get_device_data_cfg()
    except Exception as e:
        print(f"  ERROR obteniendo tablas: {e}")
        panel.disconnect()
        sys.exit(1)

    tables = {}
    for cfg in data_cfg:
        fields = [{'index': f.index, 'name': f.name, 'size': f.size, 'type': f.type}
                  for f in cfg.fields]
        tables[cfg.name] = {
            'index': cfg.index,
            'fields': fields,
        }
        field_names = [f['name'] for f in fields]
        print(f"  {cfg.name} (idx={cfg.index}): {', '.join(field_names)}")

    # Determinar tablas a leer
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
                print("  OK")
                # Re-obtener config
                data_cfg = panel._get_device_data_cfg()
                for cfg in data_cfg:
                    if cfg.name == table_name:
                        tbl = {
                            'index': cfg.index,
                            'fields': [{'index': f.index, 'name': f.name,
                                        'size': f.size, 'type': f.type}
                                       for f in cfg.fields],
                        }
                        break
            except Exception as e:
                print(f"  ERROR reconectando: {e}")
                break

        print(f"  Leyendo tabla idx={tbl['index']}, "
              f"campos={[f['name'] for f in tbl['fields']]}...")
        start_time = time.time()

        try:
            records = read_table_tolerant(
                panel, table_name, tbl['fields'], tbl['index'], args.debug
            )
        except ConnectionError as e:
            print(f"  ERROR conexion: {e}")
            print(f"  (tabla muy grande o timeout - el panel cerro la conexion)")
            # Marcar como desconectado para que reconecte
            panel._connected = False
            continue
        except Exception as e:
            print(f"  ERROR: {e}")
            continue

        elapsed = time.time() - start_time
        print(f"  Registros: {len(records)} ({elapsed:.1f}s)")

        if not records:
            continue

        print("-" * 70)

        # Mostrar registros formateados
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
            print(f"\n  ... ({len(records) - shown} registros mas, usa --limit {len(records)})")

        # Resumen para user
        if table_name == 'user' and records:
            groups = {}
            for rec in records:
                g = rec.get('Group', 0)
                groups[g] = groups.get(g, 0) + 1
            print(f"\n  RESUMEN: {len(records)} usuarios")
            for g in sorted(groups.keys()):
                print(f"    Grupo {g}: {groups[g]} usuarios")

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
