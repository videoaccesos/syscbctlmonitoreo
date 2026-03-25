"""
ZK C3-400 Panel Communication Module

Maneja la comunicacion TCP con el panel de control de acceso ZKTeco C3-400.
Soporta tres modos (en orden de prioridad):
  1. zkaccess-c3 (pip install zkaccess-c3, modulo 'c3') - PREFERIDO
  2. pyzkaccess (wrapper del PULL SDK DLL) - solo Windows
  3. Protocolo TCP directo - fallback universal

El C3-400 usa protocolo binario propietario sobre TCP puerto 4370.
Nota: la libreria zkaccess-c3 se importa como 'c3', no 'zkaccess_c3'.

Lectura de tablas (user, transaction, etc):
  Firmware v18+ responde con data_stat para tablas grandes, indicando que
  los datos no caben en un solo frame. La estrategia probada es leer
  campo-por-campo (un GETDATA por campo) y reconstruir registros por indice.
"""

import math
import struct
import socket
import logging
import time
from datetime import datetime
from typing import Optional

logger = logging.getLogger(__name__)


def c3_datetime_encode(dt_str: str) -> int:
    """Convierte fecha string 'YYYY-MM-DD HH:MM:SS' a entero C3.

    Formula ZK: ((Year-2000)*12*31 + (Month-1)*31 + (Day-1)) * 86400
                + Hour*3600 + Minute*60 + Second
    """
    try:
        dt = datetime.strptime(dt_str, "%Y-%m-%d %H:%M:%S")
    except (ValueError, TypeError):
        return 0
    return (
        ((dt.year - 2000) * 12 * 31 + (dt.month - 1) * 31 + (dt.day - 1))
        * 86400
        + dt.hour * 3600
        + dt.minute * 60
        + dt.second
    )


def c3_datetime_decode(value: int) -> str:
    """Convierte entero C3 a fecha string 'YYYY-MM-DD HH:MM:SS'.

    Inversa: Second = value % 60, Minute = (value/60) % 60, etc.
    """
    if not value or value <= 0:
        return "2000-01-01 00:00:00"
    try:
        year = math.floor(value / 32140800) + 2000
        month = math.floor(value / 2678400) % 12 + 1
        day = math.floor(value / 86400) % 31 + 1
        hour = math.floor(value / 3600) % 24
        minute = math.floor(value / 60) % 60
        second = value % 60
        return f"{year:04d}-{month:02d}-{day:02d} {hour:02d}:{minute:02d}:{second:02d}"
    except Exception:
        return "2000-01-01 00:00:00"

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
        # Prioridad 1: zkaccess-c3 (pip install zkaccess-c3, modulo 'c3')
        try:
            import c3 as zkaccess_c3_mod
            self._c3_module = zkaccess_c3_mod
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

    def get_users(self) -> list[dict]:
        """Lee la tabla de usuarios del panel.

        Retorna lista de dicts con: CardNo, Pin, Password, Group,
        StartTime, EndTime, SuperAuthorize.
        """
        return self._read_table("user")

    def get_user_authorizations(self) -> list[dict]:
        """Lee la tabla de autorizaciones por usuario.

        Retorna lista de dicts con: Pin, AuthorizeTimezoneId, AuthorizeDoorId.
        """
        return self._read_table("userauthorize")

    def get_timezones(self) -> list[dict]:
        """Lee la tabla de zonas horarias del panel."""
        return self._read_table("timezone")

    def get_transactions(self, limit: int = 0) -> list[dict]:
        """Lee la tabla de transacciones (log de eventos historicos).

        Retorna lista de dicts con: Cardno, Pin, Verified, DoorID,
        EventType, InOutState, Time_second.
        """
        records = self._read_table("transaction")
        if limit and len(records) > limit:
            return records[-limit:]
        return records

    def get_table(self, table_name: str) -> list[dict]:
        """Lee una tabla arbitraria del panel por nombre.

        Tablas disponibles tipicas: user, userauthorize, holiday,
        timezone, transaction, firstcard, multimcard, inoutfun.
        """
        return self._read_table(table_name)

    def set_user(self, card_no: str, pin: str = "", password: str = "",
                 group: int = 1, start_time: str = "2000-01-01 00:00:00",
                 end_time: str = "2099-12-31 23:59:59",
                 super_authorize: int = 0, doors: str = "1,2,3,4") -> bool:
        """Agrega o actualiza un usuario/tarjeta en el panel.

        Args:
            card_no: Numero de tarjeta (obligatorio)
            pin: ID de usuario (si vacio, usa card_no)
            password: Contraseña (opcional)
            group: Grupo de acceso (1-5, default 1)
            start_time: Inicio de validez "YYYY-MM-DD HH:MM:SS"
            end_time: Fin de validez "YYYY-MM-DD HH:MM:SS"
            super_authorize: 0=normal, 1=super usuario
            doors: Puertas autorizadas separadas por coma "1,2,3,4"

        Returns:
            True si se escribio exitosamente
        """
        if self._backend == "zkaccess_c3":
            return self._set_user_c3(card_no, pin or card_no, password,
                                     group, start_time, end_time,
                                     super_authorize, doors)
        logger.warning(f"set_user solo soportado con backend zkaccess-c3 "
                       f"(actual: {self._backend})")
        return False

    def delete_user(self, card_no: str = "", pin: str = "") -> bool:
        """Elimina un usuario/tarjeta del panel.

        Args:
            card_no: Numero de tarjeta a eliminar
            pin: O bien el PIN/ID del usuario

        Returns:
            True si se elimino exitosamente
        """
        if self._backend == "zkaccess_c3":
            return self._delete_user_c3(card_no, pin)
        logger.warning(f"delete_user solo soportado con backend zkaccess-c3 "
                       f"(actual: {self._backend})")
        return False

    def enable_card(self, card_no: str,
                    end_time: str = "2099-12-31 23:59:59") -> bool:
        """Activa una tarjeta estableciendo fecha de fin futura.

        Args:
            card_no: Numero de tarjeta
            end_time: Nueva fecha de fin de validez

        Returns:
            True si se activo exitosamente
        """
        users = self.get_users()
        user = next((u for u in users
                     if str(u.get("CardNo", "")) == str(card_no)), None)
        if not user:
            logger.error(f"Tarjeta {card_no} no encontrada en el panel")
            return False

        return self.set_user(
            card_no=str(card_no),
            pin=str(user.get("Pin", card_no)),
            password=str(user.get("Password", "")),
            group=int(user.get("Group", 1)),
            start_time=str(user.get("StartTime", "2000-01-01 00:00:00")),
            end_time=end_time,
            super_authorize=int(user.get("SuperAuthorize", 0)),
        )

    def disable_card(self, card_no: str) -> bool:
        """Desactiva una tarjeta estableciendo fecha de fin en el pasado.

        Args:
            card_no: Numero de tarjeta a desactivar

        Returns:
            True si se desactivo exitosamente
        """
        return self.enable_card(card_no, end_time="2000-01-01 00:00:00")

    def is_card_valid(self, card_no: str) -> dict:
        """Verifica si una tarjeta esta activa y su validez.

        En el C3-400:
        - StartTime=0 y EndTime=0 significa SIN RESTRICCION (siempre valida)
        - StartTime>0 y/o EndTime>0 define ventana de validez

        Returns:
            Dict con: found, active, start_time, end_time, group, pin,
                      doors, timezone_ids
        """
        users = self.get_users()
        user = next((u for u in users
                     if str(u.get("CardNo", "")) == str(card_no)), None)
        if not user:
            return {"found": False, "active": False}

        now = datetime.now()
        start_raw = user.get("StartTime", 0)
        end_raw = user.get("EndTime", 0)

        # Decodificar fechas C3 (enteros)
        if isinstance(start_raw, int):
            start_int = start_raw
            start_str = c3_datetime_decode(start_raw)
        else:
            start_str = str(start_raw) if start_raw else "2000-01-01 00:00:00"
            start_int = c3_datetime_encode(start_str)

        if isinstance(end_raw, int):
            end_int = end_raw
            end_str = c3_datetime_decode(end_raw)
        else:
            end_str = str(end_raw) if end_raw else "2099-12-31 23:59:59"
            end_int = c3_datetime_encode(end_str)

        # Logica de validez del C3:
        # Si ambos son 0, la tarjeta NO tiene restriccion de tiempo = ACTIVA
        if start_int == 0 and end_int == 0:
            active = True
            time_restricted = False
        else:
            time_restricted = True
            active = True
            try:
                if end_int > 0:
                    end_dt = datetime.strptime(end_str, "%Y-%m-%d %H:%M:%S")
                    if end_dt < now:
                        active = False
                if start_int > 0:
                    start_dt = datetime.strptime(start_str, "%Y-%m-%d %H:%M:%S")
                    if start_dt > now:
                        active = False
            except ValueError:
                pass

        # Obtener autorizaciones de puertas/horarios
        pin = str(user.get("Pin", ""))
        doors = []
        timezone_ids = []
        try:
            auths = self.get_user_authorizations()
            for auth in auths:
                if str(auth.get("Pin", "")) == pin:
                    door = auth.get("AuthorizeDoorId", 0)
                    tz = auth.get("AuthorizeTimezoneId", 0)
                    if door:
                        doors.append(int(door))
                    if tz:
                        timezone_ids.append(int(tz))
        except Exception as e:
            logger.debug(f"No se pudo leer userauthorize: {e}")

        return {
            "found": True,
            "active": active,
            "time_restricted": time_restricted,
            "card_no": str(card_no),
            "pin": pin,
            "group": int(user.get("Group", 0)),
            "start_time": start_str if time_restricted else "Sin restriccion",
            "end_time": end_str if time_restricted else "Sin restriccion",
            "super_authorize": int(user.get("SuperAuthorize", 0)),
            "doors": doors,
            "timezone_ids": timezone_ids,
        }

    def get_door_count(self) -> int:
        """Obtiene el numero de puertas del panel."""
        if self._backend == "zkaccess_c3" and self._c3_panel:
            try:
                return self._c3_panel.nr_of_locks
            except Exception:
                pass
        return 0

    def get_firmware(self) -> str:
        """Obtiene la version de firmware del panel."""
        if self._backend == "zkaccess_c3" and self._c3_panel:
            try:
                return self._c3_panel.firmware_version
            except Exception:
                pass
        return ""

    # --- Table reading (field-by-field strategy) ---

    def _read_table(self, table_name: str) -> list[dict]:
        """Lee una tabla usando la estrategia apropiada al backend."""
        if self._backend == "zkaccess_c3":
            return self._read_table_c3(table_name)
        logger.warning(f"Lectura de tablas solo soportada con backend zkaccess-c3 "
                       f"(actual: {self._backend})")
        return []

    def _read_table_c3(self, table_name: str) -> list[dict]:
        """Lee una tabla del panel via zkaccess-c3 con campo-por-campo."""
        if not self._c3_panel:
            logger.error("Panel no conectado")
            return []

        try:
            from c3 import consts, crc as c3_crc, utils
        except ImportError:
            logger.error("Modulo c3 no disponible para lectura de tablas")
            return []

        panel = self._c3_panel

        # Aplicar monkey-patch para recv robusto si no se ha hecho
        self._ensure_patched_receive()

        # Obtener esquema de tablas
        try:
            data_cfg = panel._get_device_data_cfg()
        except Exception as e:
            logger.error(f"Error obteniendo esquema de tablas: {e}")
            return []

        # Buscar la tabla solicitada
        table_cfg = None
        for cfg in data_cfg:
            if cfg.name == table_name:
                table_cfg = cfg
                break

        if not table_cfg:
            available = [cfg.name for cfg in data_cfg]
            logger.error(f"Tabla '{table_name}' no encontrada. "
                        f"Disponibles: {', '.join(available)}")
            return []

        fields = [{'index': f.index, 'name': f.name, 'type': f.type}
                  for f in table_cfg.fields]
        table_index = table_cfg.index

        # Intentar lectura completa primero
        field_indexes = sorted(f['index'] for f in fields)
        parameters = [table_index, len(field_indexes)] + field_indexes + [0, 0]

        try:
            message, msg_size = panel._send_receive(
                consts.Command.GETDATA, parameters
            )
        except Exception as e:
            logger.error(f"Error GETDATA tabla {table_name}: {e}")
            return []

        if not message or len(message) < 2:
            return []

        # Respuesta directa (tabla pequeña)
        if message[0] == table_index:
            logger.debug(f"Tabla {table_name}: respuesta directa")
            return self._parse_table_records(message, fields, table_index)

        # data_stat (tabla grande) -> campo-por-campo
        if message[0] == 0x00 and len(message) >= 9:
            total_size = struct.unpack_from('<I', message, 1)[0]
            logger.info(f"Tabla {table_name}: {total_size} bytes, "
                       f"usando lectura campo-por-campo")
            self._send_free_data_c3(panel)
            return self._read_table_field_by_field(
                panel, table_name, fields, table_index
            )

        logger.warning(f"Tabla {table_name}: formato respuesta desconocido")
        return self._parse_table_records(message, fields, table_index)

    def _read_table_field_by_field(self, panel, table_name, fields, table_index):
        """Lee tabla campo-por-campo y reconstruye registros por indice."""
        from c3 import consts

        all_field_values = {}  # field_name -> [val0, val1, ...]
        record_count = None

        for field in fields:
            fidx = field['index']
            fname = field['name']
            parameters = [table_index, 1, fidx, 0, 0]

            try:
                message, msg_size = panel._send_receive(
                    consts.Command.GETDATA, parameters
                )
            except Exception as e:
                logger.warning(f"Error leyendo campo {fname}: {e}")
                if not panel.is_connected():
                    return []
                continue

            if not message or len(message) < 3:
                continue

            # Si aun devuelve data_stat para un solo campo, liberar y saltar
            if message[0] == 0x00 and len(message) >= 9:
                self._send_free_data_c3(panel)
                logger.warning(f"Campo {fname} demasiado grande incluso solo")
                continue

            if message[0] != table_index:
                logger.debug(f"Campo {fname}: byte0={message[0]:#04x} "
                            f"inesperado (esperado {table_index:#04x})")
                continue

            # Parsear: [table_idx] [field_cnt=1] [field_idx] [records...]
            record_data = message[3:]
            values = []
            pos = 0
            while pos < len(record_data):
                field_size = record_data[pos]
                pos += 1
                if field_size > len(record_data) - pos or field_size > 200:
                    break
                raw = record_data[pos:pos + field_size]
                if field['type'] == 'i':
                    values.append(
                        int.from_bytes(raw, 'little') if raw else 0
                    )
                else:
                    values.append(
                        raw.decode('ascii', errors='ignore').rstrip('\x00')
                    )
                pos += field_size

            all_field_values[fname] = values
            if record_count is None:
                record_count = len(values)
            logger.debug(f"Campo {fname}: {len(values)} valores")

        if not all_field_values or record_count is None:
            return []

        # Reconstruir registros combinando campos por indice
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

        logger.info(f"Tabla {table_name}: {len(records)} registros leidos")
        return records

    def _send_free_data_c3(self, panel):
        """Envia FREE_DATA (cmd 0x0A) para liberar buffer del panel."""
        try:
            from c3 import consts, crc as c3_crc, utils
        except ImportError:
            return

        for cmd_byte in [0x0A, 0x0C, 0x0D, 0x0E]:
            try:
                payload_len = 4 if not panel._session_less else 0
                msg = bytearray([
                    consts.C3_PROTOCOL_VERSION,
                    cmd_byte,
                    utils.lsb(payload_len),
                    utils.msb(payload_len),
                ])
                if not panel._session_less:
                    msg.append(utils.lsb(panel._session_id))
                    msg.append(utils.msb(panel._session_id))
                    msg.append(utils.lsb(panel._request_nr))
                    msg.append(utils.msb(panel._request_nr))
                panel._request_nr += 1
                checksum = c3_crc.crc16(msg)
                msg.append(utils.lsb(checksum))
                msg.append(utils.msb(checksum))
                msg.insert(0, consts.C3_MESSAGE_START)
                msg.append(consts.C3_MESSAGE_END)

                panel._sock.send(bytes(msg))

                # Leer respuesta
                panel._sock.settimeout(3)
                header = self._recv_exact_bytes(panel._sock, 5, 3)
                if header and len(header) == 5 and header[0] == consts.C3_MESSAGE_START:
                    cmd_resp = header[2]
                    data_size = header[3] + (header[4] * 256)
                    rest = self._recv_exact_bytes(panel._sock, data_size + 3, 3)
                    if cmd_resp == 0xC8:  # REPLY_OK
                        return True
            except Exception:
                pass
        return False

    @staticmethod
    def _recv_exact_bytes(sock, n, timeout=10):
        """Recibe exactamente n bytes del socket."""
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

    def _ensure_patched_receive(self):
        """Aplica monkey-patch al metodo _receive de la libreria c3 para
        manejar fragmentacion TCP correctamente."""
        if getattr(self, '_receive_patched', False):
            return

        try:
            from c3 import C3 as C3Class, consts, utils
        except ImportError:
            return

        original_receive = C3Class._receive

        def patched_receive(panel_self):
            panel_self._sock.settimeout(panel_self.receive_timeout)

            header = bytes()
            for _ in range(panel_self.receive_retries):
                try:
                    header = ZKC3Panel._recv_exact_bytes(
                        panel_self._sock, 5, panel_self.receive_timeout
                    )
                    if len(header) == 5:
                        break
                except socket.timeout:
                    pass

            if len(header) != 5:
                raise ConnectionError(
                    f"Invalid response header; expected 5 bytes, received {header}"
                )

            message = bytearray()
            received_command, data_size, protocol_version = (
                panel_self._get_message_header(header)
            )

            payload = ZKC3Panel._recv_exact_bytes(
                panel_self._sock, data_size + 3, panel_self.receive_timeout
            )

            if data_size > 0:
                full_msg = header + payload
                message = panel_self._get_message(full_msg)

            if len(message) != data_size:
                raise ValueError(
                    f"Message length ({len(message)}) != specified ({data_size})"
                )

            if received_command == 0xC8:  # REPLY_OK
                pass
            elif received_command == 0xC9:  # REPLY_ERROR
                error = utils.byte_to_signed_int(message[-1])
                raise ConnectionError(
                    f"Error {error}: {consts.Errors.get(error, 'Unknown')}"
                )

            return message, data_size, protocol_version

        C3Class._receive = patched_receive
        self._receive_patched = True
        logger.debug("Monkey-patch _receive aplicado para TCP robusto")

    @staticmethod
    def _parse_table_records(data, fields, expected_table_idx):
        """Parsea registros de una respuesta GETDATA directa (tabla pequena)."""
        if not data or len(data) < 3:
            return []

        resp_table = data[0]
        resp_field_cnt = data[1]
        if resp_field_cnt == 0 or resp_field_cnt > 30:
            return []

        resp_field_indexes = list(data[2:2 + resp_field_cnt])
        record_data = data[2 + resp_field_cnt:]

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
                    pos = start_pos + 1
                    break
                field_info = next(
                    (f for f in fields if f['index'] == fidx), None
                )
                if field_info:
                    raw = record_data[pos:pos + field_size]
                    if field_info['type'] == 'i':
                        record[field_info['name']] = (
                            int.from_bytes(raw, 'little') if raw else 0
                        )
                    else:
                        record[field_info['name']] = (
                            raw.decode('ascii', errors='ignore').rstrip('\x00')
                        )
                pos += field_size

            if valid and record:
                records.append(record)
            elif not valid and records:
                break
            elif not valid and not records and pos < len(record_data):
                continue
            else:
                break

        return records

    # === Backend: zkaccess-c3 (Python puro) ===

    def _connect_c3(self) -> bool:
        try:
            C3 = self._c3_module.C3
            self._c3_panel = C3(self.ip)
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

    def _set_user_c3(self, card_no, pin, password, group,
                     start_time, end_time, super_authorize, doors) -> bool:
        """Escribe un usuario al panel via comando SETDATA (0x07).

        El protocolo C3 usa formato key=value separado por tabs para SETDATA.
        Las fechas se codifican como enteros C3.
        """
        if not self._c3_panel:
            logger.error("Panel no conectado")
            return False

        panel = self._c3_panel
        self._ensure_patched_receive()

        # Codificar fechas como enteros C3
        start_int = c3_datetime_encode(start_time)
        end_int = c3_datetime_encode(end_time)

        logger.debug(f"Fechas codificadas: start={start_time}->{start_int}, "
                     f"end={end_time}->{end_int}")

        # Formato SETDATA del C3: key=value separados por tabs
        data_str = (
            f"CardNo={card_no}\t"
            f"Pin={pin}\t"
            f"Password={password}\t"
            f"Group={group}\t"
            f"StartTime={start_int}\t"
            f"EndTime={end_int}\t"
            f"SuperAuthorize={super_authorize}"
        )

        payload = data_str.encode('ascii')

        # SETDATA = 0x07 (confirmado en protocolo C3)
        SETDATA = 0x07
        try:
            message, msg_size = panel._send_receive(SETDATA, payload)
            logger.info(f"Usuario {card_no} (pin={pin}) escrito al panel "
                        f"[start={start_time}, end={end_time}]")
            return True
        except Exception as e:
            logger.error(f"Error SETDATA usuario {card_no}: {e}")
            return False

    def _delete_user_c3(self, card_no: str = "", pin: str = "") -> bool:
        """Elimina un usuario del panel via comando DELETEDATA (0x09).

        El C3 usa Pin como clave primaria. Formato key=value.
        """
        if not self._c3_panel:
            logger.error("Panel no conectado")
            return False

        panel = self._c3_panel
        self._ensure_patched_receive()

        # Si solo tenemos card_no, buscamos el pin correspondiente.
        if not pin and card_no:
            users = self.get_users()
            user = next((u for u in users
                         if str(u.get("CardNo", "")) == str(card_no)), None)
            if not user:
                logger.error(f"Tarjeta {card_no} no encontrada para eliminar")
                return False
            pin = str(user.get("Pin", ""))

        if not pin:
            logger.error("Se requiere card_no o pin para eliminar")
            return False

        # DELETEDATA = 0x09, formato key=value
        DELETEDATA = 0x09
        payload = f"Pin={pin}".encode('ascii')

        try:
            message, msg_size = panel._send_receive(DELETEDATA, payload)
            logger.info(f"Usuario pin={pin} (card={card_no}) eliminado del panel")
            return True
        except Exception as e:
            logger.error(f"Error DELETEDATA usuario pin={pin}: {e}")
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
