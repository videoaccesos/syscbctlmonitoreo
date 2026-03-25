#!/usr/bin/env python3
"""
Test completo del panel ZK C3-400

1. Lee parametros del dispositivo (uno por uno)
2. Lee tablas: users, timezones, etc.
3. Registra una tarjeta de prueba
4. Abre puerta remotamente
5. Elimina la tarjeta de prueba

Uso:
  python3 test_panel_full.py miguel.ddns.accessbot.net
  python3 test_panel_full.py miguel.ddns.accessbot.net --add-card 12345678
  python3 test_panel_full.py miguel.ddns.accessbot.net --open-door 1
  python3 test_panel_full.py miguel.ddns.accessbot.net --full-test
"""

import sys
import argparse
import struct
import socket
import time
from datetime import datetime
from c3 import C3
from c3.controldevice import ControlDeviceOutput
from c3.consts import ControlOutputAddress


# ============================================================
# Protocolo TCP directo para operaciones de escritura
# (la libreria c3 solo soporta lectura)
# ============================================================

class C3Writer:
    """Extiende C3 con escritura de datos via protocolo TCP directo."""

    # Constantes del protocolo
    MSG_START = 0xAA
    MSG_END = 0x55
    PROTOCOL_V1 = 0x01
    CMD_CONNECT = 0x76      # Session connect
    CMD_SETDATA = 0x07      # Write data table
    CMD_DELETEDATA = 0x09   # Delete data
    CMD_DISCONNECT = 0x02
    REPLY_OK = 0xC8

    def __init__(self, host, port=4370):
        self.host = host
        self.port = port
        self.sock = None
        self.session_id = 0

    def _crc16(self, data):
        """CRC16/ARC usado por ZK."""
        crc = 0
        for b in data:
            crc ^= b
            for _ in range(8):
                if crc & 1:
                    crc = (crc >> 1) ^ 0xA001
                else:
                    crc >>= 1
        return crc & 0xFFFF

    def _build_message(self, command, data=b''):
        """Construye mensaje con header, CRC y trailer."""
        payload = bytes([command]) + data
        crc = self._crc16(payload)
        length = len(payload) + 2  # +2 for CRC
        msg = bytearray()
        msg.append(self.MSG_START)
        msg.append(self.PROTOCOL_V1)
        msg.extend(struct.pack('<H', length))
        msg.extend(payload)
        msg.extend(struct.pack('<H', crc))
        msg.append(self.MSG_END)
        return bytes(msg)

    def _receive(self, timeout=5):
        """Recibe respuesta del panel."""
        self.sock.settimeout(timeout)
        try:
            data = self.sock.recv(4096)
            return data
        except socket.timeout:
            return b''

    def connect(self):
        """Conecta via TCP con session handshake."""
        self.sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.sock.settimeout(10)
        ip = socket.gethostbyname(self.host)
        self.sock.connect((ip, self.port))
        # Session connect
        msg = self._build_message(self.CMD_CONNECT)
        self.sock.send(msg)
        resp = self._receive()
        if resp and len(resp) > 5:
            # Extraer session_id de la respuesta
            self.session_id = struct.unpack('<H', resp[4:6])[0] if len(resp) >= 6 else 0
            print(f"  Writer conectado (session: {self.session_id})")
            return True
        print(f"  Writer: respuesta inesperada: {resp.hex() if resp else 'vacio'}")
        return False

    def disconnect(self):
        if self.sock:
            try:
                msg = self._build_message(self.CMD_DISCONNECT)
                self.sock.send(msg)
            except Exception:
                pass
            try:
                self.sock.close()
            except Exception:
                pass

    def set_user(self, card_no, pin=None, password="", group=1,
                 start_time="2020-01-01 00:00:00",
                 end_time="2030-12-31 23:59:59",
                 super_authorize=0, doors="1,2,3,4"):
        """Registra un usuario/tarjeta en el panel.

        Args:
            card_no: Numero de tarjeta (string numerico)
            pin: Numero de empleado/PIN (default = card_no)
            password: Password (opcional, max 6 digitos)
            group: Grupo de acceso (1-99)
            start_time: Fecha inicio validez
            end_time: Fecha fin validez
            super_authorize: 0=normal, 1=super
            doors: Puertas autorizadas "1,2,3,4"
        """
        if pin is None:
            pin = card_no

        # El protocolo SETDATA usa formato key=value
        data_str = (
            f"CardNo={card_no}\t"
            f"Pin={pin}\t"
            f"Password={password}\t"
            f"Group={group}\t"
            f"StartTime={start_time}\t"
            f"EndTime={end_time}\t"
            f"SuperAuthorize={super_authorize}"
        )
        # Tabla user = index 0 en la config
        table_cmd = f"user"
        payload = f"SetData {table_cmd}\r\n{data_str}\r\n".encode('ascii')

        msg = self._build_message(self.CMD_SETDATA, payload)
        self.sock.send(msg)
        resp = self._receive()
        if resp:
            print(f"  Respuesta set_user: {resp.hex()}")
            return True
        return False


# ============================================================
# Funciones de test
# ============================================================

def read_params_one_by_one(panel):
    """Lee parametros uno por uno (compatible con firmware viejo)."""
    print("\n" + "-" * 60)
    print("  PARAMETROS DEL DISPOSITIVO")
    print("-" * 60)

    params_to_read = [
        '~SerialNumber', 'FirmVer', 'DeviceName',
        'IPAddress', 'GATEIPAddress', 'NetMask',
        'MACAddress', 'LockCount', 'ReaderCount',
        'AuxInCount', 'AuxOutCount',
        'Door1Drivertime', 'Door2Drivertime',
        'Door3Drivertime', 'Door4Drivertime',
        'Door1SensorType', 'Door2SensorType',
        'Door3SensorType', 'Door4SensorType',
        'Door1Detectortime', 'Door2Detectortime',
        'Door3Detectortime', 'Door4Detectortime',
        'Door1VerifyType', 'Door2VerifyType',
        'Door3VerifyType', 'Door4VerifyType',
        'Door1ValidTZ', 'Door2ValidTZ',
        'Door3ValidTZ', 'Door4ValidTZ',
        'AntiPassback', 'InterLock',
        'Door1ForcePassWord', 'Door2ForcePassWord',
        'Door3ForcePassWord', 'Door4ForcePassWord',
        'Door1SupperPassWord', 'Door2SupperPassWord',
        'Door3SupperPassWord', 'Door4SupperPassWord',
    ]

    results = {}
    for param in params_to_read:
        try:
            val = panel.get_device_param([param])
            value = val.get(param, '?') if isinstance(val, dict) else val
            results[param] = value
            print(f"  {param}: {value}")
        except Exception as e:
            err = str(e)
            if 'not correct' not in err and 'not available' not in err:
                print(f"  {param}: ERROR - {err}")

    return results


def read_all_tables(panel):
    """Lee todas las tablas disponibles.
    Reconecta automaticamente si una tabla grande rompe la conexion.
    """
    print("\n" + "-" * 60)
    print("  TABLAS DE DATOS")
    print("-" * 60)

    try:
        data_cfg = panel._get_device_data_cfg()
    except Exception as e:
        print(f"  Error obteniendo config de tablas: {e}")
        return

    # Tablas que suelen fallar con datos grandes o firmware viejo
    skip_tables = {'firstcard', 'multimcard', 'inoutfun'}
    # Tablas criticas que queremos leer (en orden de prioridad)
    priority_tables = ['user', 'userauthorize', 'timezone', 'holiday', 'transaction']

    # Ordenar: primero las prioritarias, luego el resto
    cfg_map = {cfg.name: cfg for cfg in data_cfg}
    ordered = []
    for name in priority_tables:
        if name in cfg_map:
            ordered.append(cfg_map[name])
    for cfg in data_cfg:
        if cfg.name not in priority_tables:
            ordered.append(cfg)

    for cfg in ordered:
        fields = [f.name for f in cfg.fields]
        print(f"\n  Tabla: {cfg.name}")
        print(f"  Campos: {', '.join(fields)}")

        if cfg.name in skip_tables:
            print(f"  (saltada - tabla auxiliar no critica)")
            continue

        # Verificar conexion antes de leer
        if not panel.is_connected():
            print(f"  Reconectando...")
            try:
                panel.connect()
                print(f"  Reconectado OK")
            except Exception as e:
                print(f"  No se pudo reconectar: {e}")
                break

        try:
            rows = panel.get_device_data(cfg.name)
            if not rows:
                print(f"  Registros: 0 (vacia)")
            else:
                print(f"  Registros: {len(rows)}")
                for i, row in enumerate(rows[:10]):
                    print(f"    [{i+1}] {row}")
                if len(rows) > 10:
                    print(f"    ... ({len(rows) - 10} mas)")
        except ConnectionError as e:
            print(f"  Error conexion: {e}")
            print(f"  (tabla grande o timeout - reconectando para siguiente)")
        except Exception as e:
            print(f"  Error leyendo: {e}")


def open_door(panel, door_nr, duration=5):
    """Abre una puerta remotamente."""
    print(f"\n  Abriendo puerta {door_nr} por {duration}s...")
    try:
        cmd = ControlDeviceOutput(
            output_number=door_nr,
            address=ControlOutputAddress.DOOR_OUTPUT,
            duration=duration
        )
        panel.control_device(cmd)
        print(f"  >>> Puerta {door_nr} ABIERTA por {duration}s!")
        return True
    except Exception as e:
        print(f"  Error: {e}")
        return False


def monitor_events(panel, duration=15):
    """Monitorea eventos en tiempo real."""
    print(f"\n" + "-" * 60)
    print(f"  MONITOREO EN TIEMPO REAL ({duration}s)")
    print(f"  Pasa una tarjeta o presiona boton de salida...")
    print("-" * 60)

    start = time.time()
    events_seen = []

    while time.time() - start < duration:
        try:
            events = panel.get_rt_log()
            if events:
                for ev in events:
                    event_type = getattr(ev, 'event_type', None)
                    if event_type is not None and int(event_type) == 255:
                        # Heartbeat status
                        elapsed = time.time() - start
                        print(f"\r  [{elapsed:.0f}s] Heartbeat puertas OK    ",
                              end='', flush=True)
                        continue

                    events_seen.append(ev)
                    card = getattr(ev, 'card_no', '?')
                    door = getattr(ev, 'door', '?')
                    ts = getattr(ev, 'time_second', '')
                    verified = getattr(ev, 'verified', '')
                    in_out = getattr(ev, 'in_out_state', '?')

                    print(f"\n  EVENTO: tipo={event_type} "
                          f"tarjeta={card} puerta={door} "
                          f"dir={in_out} verif={verified} "
                          f"hora={ts}")
        except Exception as e:
            print(f"\n  Error poll: {e}")

        time.sleep(2)

    print(f"\n  Total eventos: {len(events_seen)}")
    return events_seen


def main():
    parser = argparse.ArgumentParser(description='Test completo ZK C3-400')
    parser.add_argument('host', help='IP o hostname del panel')
    parser.add_argument('--open-door', type=int, metavar='N',
                        help='Abrir puerta N (1-4)')
    parser.add_argument('--open-duration', type=int, default=5,
                        help='Duracion apertura (default: 5s)')
    parser.add_argument('--monitor', type=int, metavar='SECONDS',
                        help='Monitorear eventos por N segundos')
    parser.add_argument('--full-test', action='store_true',
                        help='Ejecutar test completo')
    args = parser.parse_args()

    print("=" * 60)
    print(f"  ZK C3-400 - Test Completo")
    print(f"  Host: {args.host}")
    print(f"  Fecha: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)

    # Conectar
    panel = C3(args.host)
    print(f"\nConectando a {args.host}...")
    panel.connect()
    print("Conectado OK")

    # Info basica
    print(f"\n  Serial:   {panel.serial_number}")
    print(f"  Firmware: {panel.firmware_version}")
    print(f"  Puertas:  {panel.nr_of_locks}")

    if args.full_test or (not args.open_door and not args.monitor):
        # Leer parametros
        params = read_params_one_by_one(panel)

        # Leer tablas
        read_all_tables(panel)

        # Reconectar si tabla grande rompio conexion
        if not panel.is_connected():
            print("\n  Reconectando para status...")
            panel.connect()

        # Status actual (usando params ya leidos, no door_settings que crashea)
        print("\n" + "-" * 60)
        print("  STATUS DE PUERTAS")
        print("-" * 60)
        nr_locks = int(params.get('LockCount', 4))
        for i in range(1, nr_locks + 1):
            try:
                lock = panel.lock_status(i)
            except Exception:
                lock = "?"
            # Usar los params que ya leimos individualmente
            drive = params.get(f'Door{i}Drivertime', '?')
            detect = params.get(f'Door{i}Detectortime', '?')
            sensor = params.get(f'Door{i}SensorType', '?')
            verify = params.get(f'Door{i}VerifyType', '?')
            valid_tz = params.get(f'Door{i}ValidTZ', '?')
            print(f"  Puerta {i}: cerradura={lock} "
                  f"drive_time={drive}s "
                  f"alarm_timeout={detect}s "
                  f"sensor={sensor} "
                  f"verify={verify} "
                  f"timezone={valid_tz}")

    # Reconectar si necesario antes de comandos
    if (args.open_door or args.monitor or args.full_test) and not panel.is_connected():
        print("\n  Reconectando...")
        panel.connect()

    # Abrir puerta si se pidio
    if args.open_door:
        print("\n" + "-" * 60)
        print("  APERTURA REMOTA")
        print("-" * 60)
        open_door(panel, args.open_door, args.open_duration)

    # Monitorear eventos
    if args.monitor:
        monitor_events(panel, args.monitor)
    elif args.full_test:
        monitor_events(panel, 15)

    # Desconectar
    panel.disconnect()
    print("\n" + "=" * 60)
    print("  Test completado - Desconectado OK")
    print("=" * 60)


if __name__ == '__main__':
    main()
