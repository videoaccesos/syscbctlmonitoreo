"""
MQTT Publisher para eventos del C3-400

Publica eventos de acceso al broker Mosquitto con formato
compatible con el Bot Orquestador existente.
"""

import json
import logging
import time
from datetime import datetime

import paho.mqtt.client as mqtt

logger = logging.getLogger(__name__)


class MQTTPublisher:
    """Publica eventos del C3-400 al broker MQTT."""

    def __init__(self, broker: str, port: int = 1883,
                 username: str = "", password: str = "",
                 use_tls: bool = False, qos: int = 1,
                 keepalive: int = 60, topic_prefix: str = "videoaccesos",
                 site_id: str = "default"):
        self.broker = broker
        self.port = port
        self.username = username
        self.password = password
        self.use_tls = use_tls
        self.qos = qos
        self.keepalive = keepalive
        self.topic_prefix = topic_prefix
        self.site_id = site_id
        self._client: mqtt.Client | None = None
        self._connected = False

    @property
    def connected(self) -> bool:
        return self._connected

    def connect(self) -> bool:
        """Conecta al broker MQTT."""
        try:
            client_id = f"zk_bridge_{self.site_id}_{int(time.time())}"
            self._client = mqtt.Client(client_id=client_id)

            if self.username:
                self._client.username_pw_set(self.username, self.password)

            if self.use_tls:
                self._client.tls_set()

            self._client.on_connect = self._on_connect
            self._client.on_disconnect = self._on_disconnect
            self._client.on_message = self._on_message

            # Will message: si el bridge se desconecta inesperadamente
            will_topic = f"{self.topic_prefix}/{self.site_id}/bridge/status"
            will_payload = json.dumps({
                "status": "offline",
                "timestamp": datetime.now().isoformat()
            })
            self._client.will_set(will_topic, will_payload, qos=1, retain=True)

            logger.info(f"Conectando a MQTT broker: {self.broker}:{self.port}")
            self._client.connect(self.broker, self.port, self.keepalive)
            self._client.loop_start()

            # Esperar conexion
            timeout = 10
            while not self._connected and timeout > 0:
                time.sleep(0.5)
                timeout -= 0.5

            if self._connected:
                # Suscribirse a comandos (abrir puerta remota, etc.)
                cmd_topic = f"{self.topic_prefix}/{self.site_id}/cmd/#"
                self._client.subscribe(cmd_topic, qos=1)
                logger.info(f"Suscrito a comandos: {cmd_topic}")
                return True

            logger.error("Timeout esperando conexion MQTT")
            return False

        except Exception as e:
            logger.error(f"Error conectando a MQTT: {e}")
            return False

    def disconnect(self):
        """Desconecta del broker MQTT."""
        if self._client:
            # Publicar estado offline
            self._publish_status("offline")
            self._client.loop_stop()
            self._client.disconnect()
            self._client = None
            self._connected = False

    def publish_event(self, event_data: dict):
        """Publica un evento de acceso."""
        topic = (f"{self.topic_prefix}/{self.site_id}/events/"
                 f"door{event_data.get('door_id', 0)}")

        payload = {
            "site_id": self.site_id,
            "source": "zk_c3_400",
            **event_data,
            "published_at": datetime.now().isoformat(),
        }

        self._publish(topic, payload)

    def publish_heartbeat(self, panel_connected: bool, extra: dict = None):
        """Publica heartbeat periodico."""
        payload = {
            "status": "online",
            "panel_connected": panel_connected,
            "timestamp": datetime.now().isoformat(),
        }
        if extra:
            payload.update(extra)

        self._publish_status("online", payload)

    def _publish(self, topic: str, payload: dict):
        """Publica un mensaje JSON al broker."""
        if not self._client or not self._connected:
            logger.warning(f"No conectado a MQTT, descartando: {topic}")
            return

        try:
            msg = json.dumps(payload, ensure_ascii=False)
            result = self._client.publish(topic, msg, qos=self.qos)
            if result.rc == mqtt.MQTT_ERR_SUCCESS:
                logger.debug(f"Publicado: {topic} -> {msg[:100]}")
            else:
                logger.warning(f"Error publicando a {topic}: rc={result.rc}")
        except Exception as e:
            logger.error(f"Error publicando MQTT: {e}")

    def publish_data(self, data_type: str, records: list, extra: dict = None):
        """Publica datos de tabla (usuarios, transacciones, etc.)."""
        topic = f"{self.topic_prefix}/{self.site_id}/data/{data_type}"

        payload = {
            "site_id": self.site_id,
            "source": "zk_c3_400",
            "data_type": data_type,
            "count": len(records),
            "records": records,
            "synced_at": datetime.now().isoformat(),
        }
        if extra:
            payload.update(extra)

        self._publish(topic, payload)
        logger.info(f"Sync {data_type}: {len(records)} registros publicados")

    def _publish_status(self, status: str, payload: dict = None):
        """Publica estado del bridge."""
        topic = f"{self.topic_prefix}/{self.site_id}/bridge/status"
        if payload is None:
            payload = {
                "status": status,
                "timestamp": datetime.now().isoformat(),
            }
        try:
            msg = json.dumps(payload, ensure_ascii=False)
            if self._client:
                self._client.publish(topic, msg, qos=1, retain=True)
        except Exception:
            pass

    # Callbacks

    def _on_connect(self, client, userdata, flags, rc):
        if rc == 0:
            self._connected = True
            logger.info("Conectado al broker MQTT")
            self._publish_status("online")
        else:
            reasons = {
                1: "version protocolo incorrecta",
                2: "identificador rechazado",
                3: "broker no disponible",
                4: "credenciales incorrectas",
                5: "no autorizado",
            }
            reason = reasons.get(rc, f"codigo {rc}")
            logger.error(f"Conexion MQTT rechazada: {reason}")

    def _on_disconnect(self, client, userdata, rc):
        self._connected = False
        if rc == 0:
            logger.info("Desconectado de MQTT (limpio)")
        else:
            logger.warning(f"Desconexion inesperada de MQTT (rc={rc}) - reconectando...")

    def _on_message(self, client, userdata, msg):
        """Procesa comandos recibidos (ej: abrir puerta remota)."""
        try:
            topic = msg.topic
            payload = json.loads(msg.payload.decode())
            logger.info(f"Comando recibido: {topic} -> {payload}")

            # Los comandos se procesan en bridge.py via callback
            if hasattr(self, 'on_command'):
                self.on_command(topic, payload)
        except Exception as e:
            logger.error(f"Error procesando comando: {e}")
