"""
ZK C3-400 Panel Communication Module

Maneja la comunicacion TCP con el panel de control de acceso ZKTeco C3-400.
Soporta tres modos (en orden de prioridad):
  1. zkaccess-c3 (Python puro, funciona en Linux/Windows) - PREFERIDO
  2. pyzkaccess (wrapper del PULL SDK DLL) - solo Windows
  3. Protocolo TCP directo - fallback universal

El C3-400 usa protocolo binario propietario sobre TCP puerto 4370.
"""

import struct
import socket
import logging
import time
from datetime import datetime
from typing import Optional

logger = logging.getLogger(__name__)

# Constantes del protocolo ZK (para modo raw TCP)
ZK_CMD_CONNECT = 1000
ZK_CMD_EXIT = 1001
ZK_CMD_GET_SERIAL = 1534
ZK_CMD_ACK_OK = 2000
ZK_CMD_GET_RT_LOG = 501
ZK_CMD_UNLOCK = 31

# Tipos de evento del C3-400
EVENT_TYPES = {
    0: "normal_punch",            # Marcaje normal (tarjeta/huella valida)
    1: "punch_during_open",       # Marcaje con puerta abierta
    2: "first_card_open",         # Primera tarjeta (apertura grupal)
    3: "multi_card_open",         # Apertura multi-tarjeta
    4: "emergency_password",      # Password de emergencia
    5: "door_open_during_close",  # Puerta abierta en horario cerrado
    6: "linkage_event",           # Evento de enlace
    7: "cancel_alarm",            # Cancelar alarma
    20: "remote_open",            # Apertura remota
    23: "multi_card_open_fp",     # Multi-tarjeta + huella
    200: "door_opened",           # Puerta abierta (sensor)
    201: "door_closed",           # Puerta cerrada (sensor)
    202: "exit_button",           # Boton de salida presionado
    203: "multi_card_timeout",    # Timeout multi-tarjeta
    204: "card_denied",           # Tarjeta no registrada
    205: "too_short_interval",    # Intervalo demasiado corto
    206: "door_inactive_zone",    # Zona inactiva
    207: "illegal_timezone",      # Zona horaria ilegal
    208: "access_denied",         # Acceso denegado
    209: "anti_passback",         # Anti-passback
    215: "door_forced_open",      # Puerta forzada
    220: "door_alarm",            # Alarma de puerta
}

VERIFY_MODES = {
    1: "fingerprint",
    3: "password",
    4: "card",
    11: "card_fingerprint",
    200: "other",
}


class ZKEvent:
    """Representa un evento del panel C3-400."""

    def __init__(self, card_no: str = "", door_id: int = 0,
                 event_type: int = 0, entry_exit: int = 0,
                 verify_mode: int = 0, timestamp: Optional[datetime] = None):
        self.card_no = card_no
        self.door_id = door_id
        self.event_type = event_type
        self.entry_exit = entry_exit  # 0=entrada, 1=salida
        self.verify_mode = verify_mode
        self.timestamp = timestamp or datetime.now()

    @property
    def event_name(self) -> str:
        return EVENT_TYPES.get(self.event_type, f"unknown_{self.event_type}")

    @property
    def verify_name(self) -> str:
        return VERIFY_MODES.get(self.verify_mode, f"unknown_{self.verify_mode}")

    @property
    def direction(self) -> str:
        return "exit" if self.entry_exit == 1 else "entry"

    def to_dict(self) -> dict:
        return {
            "card_no": self.card_no,
            "door_id": self.door_id,
            "event_type": self.event_type,
            "event_name": self.event_name,
            "entry_exit": self.entry_exit,
            "direction": self.direction,
            "verify_mode": self.verify_mode,
            "verify_name": self.verify_name,
            "timestamp": self.timestamp.isoformat(),
        }

    def __repr__(self):
        return (f"ZKEvent(card={self.card_no}, door={self.door_id}, "
                f"event={self.event_name}, dir={self.direction}, "
                f"time={self.timestamp})")


class ZKC3Panel:
    """
    Comunicacion con el panel ZK C3-400.

    Prioridad de backends:
      1. zkaccess-c3 (pip install zkaccess-c3) - Python puro, Linux+Windows
      2. pyzkaccess (pip install pyzkaccess) - PULL SDK DLL, solo Windows
      3. Protocolo TCP raw - fallback
    """

    def __init__(self, ip: str, port: int = 4370, timeout: int = 5):
        self.ip = ip
        self.port = port
        self.timeout = timeout
        self._connected = False
        self._backend = "raw"  # "zkaccess_c3", "pyzkaccess", o "raw"

        # Backend zkaccess-c3 (Python puro)
        self._c3_panel = None
        self._c3_module = None

        # Backend pyzkaccess (PULL SDK DLL)
        self._sdk_panel = None

        # Backend raw TCP
        self._sock: Optional[socket.socket] = None
        self._session_id = 0
        self._reply_id = 0

        self._detect_backend()

    def _detect_backend(self):
        """Detecta el mejor backend disponible."""
        # Prioridad 1: zkaccess-c3 (Python puro, Linux nativo)
        try:
            import zkaccess_c3
            self._c3_module = zkaccess_c3
            self._backend = "zkaccess_c3"
            logger.info("Backend: zkaccess-c3 (Python puro, Linux nativo)")
            return
        except ImportError:
            pass

        # Prioridad 2: pyzkaccess (PULL SDK DLL, solo Windows)
        try:
            from pyzkaccess import ZKAccess
            self._zk_access_class = ZKAccess
            self._backend = "pyzkaccess"
            logger.info("Backend: pyzkaccess (PULL SDK DLL)")
            return
        except ImportError:
            pass
        except OSError as e:
            logger.warning(f"pyzkaccess no puede cargar DLL: {e}")

        # Prioridad 3: Raw TCP
        self._backend = "raw"
        logger.info("Backend: protocolo TCP directo (sin SDK)")

    @property
    def connected(self) -> bool:
        return self._connected

    @property
    def backend(self) -> str:
        return self._backend

    # --- Interfaz publica ---

    def connect(self) -> bool:
        """Establece conexion con el panel."""
        if self._backend == "zkaccess_c3":
            return self._connect_c3()
        elif self._backend == "pyzkaccess":
            return self._connect_sdk()
        return self._connect_raw()

    def disconnect(self):
        """Cierra la conexion con el panel."""
        if self._backend == "zkaccess_c3":
            self._disconnect_c3()
        elif self._backend == "pyzkaccess":
            self._disconnect_sdk()
        else:
            self._disconnect_raw()
        self._connected = False

    def get_events(self) -> list[ZKEvent]:
        """Obtiene eventos en tiempo real del panel."""
        if self._backend == "zkaccess_c3":
            return self._get_events_c3()
        elif self._backend == "pyzkaccess":
            return self._get_events_sdk()
        return self._get_events_raw()

    def get_serial(self) -> str:
        """Obtiene el numero de serie del panel."""
        if self._backend == "zkaccess_c3":
            return self._get_serial_c3()
        elif self._backend == "pyzkaccess":
            return self._get_serial_sdk()
        return self._get_serial_raw()

    def open_door(self, door_id: int, duration: int = 5) -> bool:
        """Abre una puerta por N segundos."""
        if self._backend == "zkaccess_c3":
            return self._open_door_c3(door_id, duration)
        elif self._backend == "pyzkaccess":
            return self._open_door_sdk(door_id, duration)
        return self._open_door_raw(door_id, duration)

    # === Backend: zkaccess-c3 (Python puro) ===

    def _connect_c3(self) -> bool:
        try:
            C3 = self._c3_module.C3
            self._c3_panel = C3(self.ip, self.port)
            self._c3_panel.connect()
            self._connected = True
            serial = self._get_serial_c3()
            logger.info(f"Conectado via zkaccess-c3: {self.ip}:{self.port} "
                        f"(S/N: {serial})")
            return True
        except Exception as e:
            logger.error(f"Error conectando via zkaccess-c3: {e}")
            self._connected = False
            return False

    def _disconnect_c3(self):
        if self._c3_panel:
            try:
                self._c3_panel.disconnect()
            except Exception:
                pass
            self._c3_panel = None

    def _get_events_c3(self) -> list[ZKEvent]:
        events = []
        if not self._c3_panel:
            return events
        try:
            rt_events = self._c3_panel.get_rt_log()
            for ev in rt_events:
                events.append(ZKEvent(
                    card_no=str(getattr(ev, 'card_no', getattr(ev, 'card', ''))),
                    door_id=getattr(ev, 'door', getattr(ev, 'door_id', 0)),
                    event_type=getattr(ev, 'event_type', 0),
                    entry_exit=getattr(ev, 'in_out_state',
                                       getattr(ev, 'entry_exit', 0)),
                    verify_mode=getattr(ev, 'verify_type',
                                        getattr(ev, 'verify_mode', 0)),
                    timestamp=getattr(ev, 'time_second',
                                      getattr(ev, 'timestamp', datetime.now())),
                ))
        except Exception as e:
            logger.error(f"Error obteniendo eventos zkaccess-c3: {e}")
            # Verificar si la conexion se perdio
            try:
                self._c3_panel.get_rt_log()
            except Exception:
                self._connected = False
        return events

    def _get_serial_c3(self) -> str:
        if not self._c3_panel:
            return ""
        try:
            params = self._c3_panel.get_device_param(
                ['SerialNumber', 'serialnumber', '~SerialNumber'])
            if isinstance(params, dict):
                for key in ['SerialNumber', 'serialnumber', '~SerialNumber']:
                    if key in params:
                        return str(params[key])
            return str(params) if params else ""
        except Exception as e:
            logger.debug(f"No se pudo obtener serial via get_device_param: {e}")
            return ""

    def _open_door_c3(self, door_id: int, duration: int = 5) -> bool:
        if not self._c3_panel:
            return False
        try:
            self._c3_panel.control_device(
                output_address=door_id,
                operation=1,  # 1 = activar
                duration=duration,
            )
            logger.info(f"Puerta {door_id} abierta por {duration}s via zkaccess-c3")
            return True
        except Exception as e:
            logger.error(f"Error abriendo puerta {door_id} via zkaccess-c3: {e}")
            return False

    # === Backend: pyzkaccess (PULL SDK DLL - Windows) ===

    def _connect_sdk(self) -> bool:
        try:
            connstr = f"protocol=TCP,ipaddress={self.ip},port={self.port}"
            self._sdk_panel = self._zk_access_class(connstr=connstr)
            self._connected = True
            serial = self._sdk_panel.parameters.serial_number
            logger.info(f"Conectado via PULL SDK: {self.ip} (S/N: {serial})")
            return True
        except Exception as e:
            logger.error(f"Error conectando via PULL SDK: {e}")
            self._connected = False
            return False

    def _disconnect_sdk(self):
        if self._sdk_panel:
            try:
                self._sdk_panel = None
            except Exception:
                pass

    def _get_events_sdk(self) -> list[ZKEvent]:
        events = []
        try:
            raw_events = self._sdk_panel.events.refresh()
            for ev in raw_events:
                events.append(ZKEvent(
                    card_no=str(getattr(ev, 'card', '')),
                    door_id=getattr(ev, 'door', 0),
                    event_type=getattr(ev, 'event_type', 0),
                    entry_exit=getattr(ev, 'entry_exit', 0),
                    verify_mode=getattr(ev, 'verify_mode', 0),
                    timestamp=getattr(ev, 'time', datetime.now()),
                ))
        except Exception as e:
            logger.error(f"Error obteniendo eventos PULL SDK: {e}")
        return events

    def _get_serial_sdk(self) -> str:
        try:
            return self._sdk_panel.parameters.serial_number
        except Exception:
            return ""

    def _open_door_sdk(self, door_id: int, duration: int = 5) -> bool:
        try:
            self._sdk_panel.relays.switch_on(door_id, duration)
            logger.info(f"Puerta {door_id} abierta por {duration}s via PULL SDK")
            return True
        except Exception as e:
            logger.error(f"Error abriendo puerta {door_id} via PULL SDK: {e}")
            return False

    # === Backend: Raw TCP Protocol ===

    def _connect_raw(self) -> bool:
        try:
            self._sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            self._sock.settimeout(self.timeout)
            self._sock.connect((self.ip, self.port))

            cmd_data = self._build_packet(ZK_CMD_CONNECT)
            self._sock.send(cmd_data)

            response = self._recv_packet()
            if response and self._get_cmd(response) == ZK_CMD_ACK_OK:
                self._session_id = struct.unpack('<H', response[4:6])[0]
                self._connected = True
                logger.info(f"Conectado via TCP raw: {self.ip}:{self.port} "
                            f"(session={self._session_id})")
                return True
            else:
                logger.error(f"Panel rechazo conexion: {self.ip}")
                self._sock.close()
                return False

        except (socket.timeout, ConnectionRefusedError, OSError) as e:
            logger.error(f"Error TCP conectando a {self.ip}:{self.port}: {e}")
            if self._sock:
                self._sock.close()
                self._sock = None
            return False

    def _disconnect_raw(self):
        if self._sock:
            try:
                cmd_data = self._build_packet(ZK_CMD_EXIT)
                self._sock.send(cmd_data)
                self._sock.close()
            except Exception:
                pass
            self._sock = None

    def _get_events_raw(self) -> list[ZKEvent]:
        events = []
        if not self._sock:
            return events
        try:
            cmd_data = self._build_packet(ZK_CMD_GET_RT_LOG)
            self._sock.send(cmd_data)
            self._sock.settimeout(1.0)
            try:
                response = self._recv_packet()
                if response and len(response) > 16:
                    events = self._parse_event_data(response[8:])
            except socket.timeout:
                pass
            finally:
                self._sock.settimeout(self.timeout)
        except (BrokenPipeError, ConnectionResetError, OSError) as e:
            logger.warning(f"Conexion perdida al leer eventos: {e}")
            self._connected = False
        return events

    def _get_serial_raw(self) -> str:
        if not self._sock:
            return ""
        try:
            cmd_data = self._build_packet(ZK_CMD_GET_SERIAL)
            self._sock.send(cmd_data)
            response = self._recv_packet()
            if response and len(response) > 8:
                return response[8:].decode('ascii', errors='ignore').strip('\x00')
        except Exception as e:
            logger.error(f"Error obteniendo serial: {e}")
        return ""

    def _open_door_raw(self, door_id: int, duration: int = 5) -> bool:
        if not self._sock:
            return False
        try:
            payload = struct.pack('<BBI', door_id, duration, 0)
            cmd_data = self._build_packet(ZK_CMD_UNLOCK, payload)
            self._sock.send(cmd_data)
            response = self._recv_packet()
            if response and self._get_cmd(response) == ZK_CMD_ACK_OK:
                logger.info(f"Puerta {door_id} abierta por {duration}s via TCP raw")
                return True
            return False
        except Exception as e:
            logger.error(f"Error abriendo puerta {door_id}: {e}")
            return False

    # --- Protocol Helpers ---

    def _build_packet(self, command: int, data: bytes = b'') -> bytes:
        self._reply_id += 1
        buf = struct.pack('<HHHH', command, 0, self._session_id,
                          self._reply_id) + data
        chksum = self._checksum(buf)
        buf = struct.pack('<HHHH', command, chksum, self._session_id,
                          self._reply_id) + data
        header = struct.pack('<HH', 0x5050, len(buf))
        return header + buf

    def _recv_packet(self) -> Optional[bytes]:
        try:
            header = self._recv_exact(4)
            if not header:
                return None
            magic, length = struct.unpack('<HH', header)
            if magic != 0x5050:
                logger.warning(f"Magic invalido: 0x{magic:04x}")
                return None
            return self._recv_exact(length)
        except Exception:
            return None

    def _recv_exact(self, n: int) -> Optional[bytes]:
        data = b''
        while len(data) < n:
            chunk = self._sock.recv(n - len(data))
            if not chunk:
                return None
            data += chunk
        return data

    @staticmethod
    def _get_cmd(data: bytes) -> int:
        if len(data) >= 2:
            return struct.unpack('<H', data[0:2])[0]
        return 0

    @staticmethod
    def _checksum(data: bytes) -> int:
        chksum = 0
        for i in range(0, len(data), 2):
            if i + 1 < len(data):
                chksum += struct.unpack('<H', data[i:i + 2])[0]
            else:
                chksum += data[i]
        chksum = (chksum % 65536)
        chksum = 65536 - chksum
        return chksum & 0xFFFF

    def _parse_event_data(self, data: bytes) -> list[ZKEvent]:
        events = []
        record_size = 32
        offset = 0
        while offset + record_size <= len(data):
            try:
                record = data[offset:offset + record_size]
                card_no = struct.unpack('<I', record[0:4])[0]
                door_id = record[4]
                entry_exit = record[5]
                event_type = record[6]
                verify_mode = record[7]
                try:
                    year = 2000 + record[8]
                    month = max(1, min(12, record[9]))
                    day = max(1, min(31, record[10]))
                    hour = min(23, record[11])
                    minute = min(59, record[12])
                    second = min(59, record[13])
                    ts = datetime(year, month, day, hour, minute, second)
                except (ValueError, IndexError):
                    ts = datetime.now()
                if card_no > 0 or event_type > 0:
                    events.append(ZKEvent(
                        card_no=str(card_no) if card_no > 0 else "",
                        door_id=door_id,
                        event_type=event_type,
                        entry_exit=entry_exit,
                        verify_mode=verify_mode,
                        timestamp=ts,
                    ))
            except (struct.error, IndexError) as e:
                logger.debug(f"Error parseando evento en offset {offset}: {e}")
            offset += record_size
        return events
