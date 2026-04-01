# -*- coding: utf-8 -*-
"""
plugin_vision.py
------------------------------------------------------------
Plugin de alertas de portones via video vigilancia.

Suscribe a alertas MQTT del sistema de video accesos (gate monitor)
y notifica a supervisores via WhatsApp con evidencia fotografica
cuando un porton permanece abierto mas tiempo del permitido.
------------------------------------------------------------
"""

import os
import json
import logging
import threading
import time
from collections import deque
from datetime import datetime

import requests
from flask import request as flask_request, jsonify

from modulo_base import ModuloBase, IntentKeywords, MenuEntry, CommandResult
import mqtt_service
import db

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constantes
# ---------------------------------------------------------------------------

MQTT_TOPIC_GATE_ALERT = "videoaccesos/+/alert"
GATE_STATUS_URL = "http://localhost:3000/api/gate-monitor/status"
# Dominio del servidor Next.js para construir URL absoluta de imagenes
NEXTJS_DOMAIN = os.getenv("NEXTJS_DOMAIN", "https://videoaccesos.net")
THROTTLE_SECONDS = 300  # 5 minutos entre alertas del mismo porton
ALERT_LOG_MAXLEN = 20


class PluginVision(ModuloBase):
    """Plugin de alertas de portones basado en vision por computadora."""

    def __init__(self):
        self._twilio_client = None
        self._twilio_phone = None
        self._alert_log: deque = deque(maxlen=ALERT_LOG_MAXLEN)
        self._last_alert_ts: dict[str, float] = {}  # "site:cam" -> epoch
        self._lock = threading.Lock()

    # ------------------------------------------------------------------
    # ModuloBase interface
    # ------------------------------------------------------------------

    def get_name(self) -> str:
        return "vision"

    def get_intents(self) -> list[IntentKeywords]:
        return [
            IntentKeywords(
                intent="estado_portones",
                keywords=["portones", "estado portones", "gates",
                          "porton estado", "portones abiertos",
                          "estado de portones"],
                priority=7,
            ),
        ]

    def get_menu_entries(self) -> list[MenuEntry]:
        return [
            MenuEntry(
                key="estado_portones",
                label="Estado de portones",
                roles=["supervisor", "operador"],
                order=60,
            ),
        ]

    def handle_intent(self, intent: str, texto: str, telefono: str,
                      contexto: dict) -> CommandResult:
        if intent == "estado_portones":
            nivel = contexto.get("nivel", "residente")
            if nivel not in ("supervisor", "operador"):
                return CommandResult(
                    text="Este comando solo esta disponible para supervisores.",
                    error=True,
                )
            return self._handle_estado_portones()
        return CommandResult(text="Intent no reconocido.")

    def get_routes(self) -> list[dict] | None:
        return [
            {
                "rule": "/api/vision/alert",
                "methods": ["POST"],
                "handler": self._route_manual_alert,
            },
        ]

    def init(self, app_context: dict):
        self._twilio_client = app_context.get("twilio_client")
        self._twilio_phone = app_context.get("twilio_phone")

        # Suscribir a alertas MQTT de portones
        # mqtt_service.subscribe usa callback(topic, payload)
        try:
            mqtt_service.subscribe(MQTT_TOPIC_GATE_ALERT, self._on_gate_alert)
            logger.info("[Vision] Suscrito a MQTT: %s", MQTT_TOPIC_GATE_ALERT)
        except Exception:
            logger.exception("[Vision] Error al suscribirse a MQTT")

    def health_check(self) -> dict:
        with self._lock:
            recent = list(self._alert_log)
        return {
            "status": "ok" if mqtt_service.is_connected() else "mqtt_disconnected",
            "topic": MQTT_TOPIC_GATE_ALERT,
            "alerts_sent": len(recent),
            "last_alerts": recent[-5:] if recent else [],
        }

    # ------------------------------------------------------------------
    # MQTT callback - firma: (topic: str, payload: dict|str)
    # mqtt_service.py ya parsea el JSON antes de llamar al callback
    # ------------------------------------------------------------------

    def _on_gate_alert(self, topic: str, payload):
        """Callback ejecutado cuando llega una alerta MQTT de porton."""
        if not isinstance(payload, dict):
            return
        if payload.get("type") != "gate_alert":
            return

        site_id = str(payload.get("site_id", ""))
        cam_id = str(payload.get("cam_id", ""))
        throttle_key = f"{site_id}:{cam_id}"

        # Throttle: max 1 alerta por porton cada 5 min
        now = time.time()
        with self._lock:
            last = self._last_alert_ts.get(throttle_key, 0)
            if now - last < THROTTLE_SECONDS:
                logger.debug("[Vision] Throttled %s (%ds restantes)",
                             throttle_key,
                             int(THROTTLE_SECONDS - (now - last)))
                return
            self._last_alert_ts[throttle_key] = now

        # Procesar en hilo aparte para no bloquear loop MQTT
        threading.Thread(
            target=self._process_alert,
            args=(payload,),
            daemon=True,
        ).start()

    # ------------------------------------------------------------------
    # Procesamiento de alertas
    # ------------------------------------------------------------------

    def _process_alert(self, payload: dict):
        """Consulta supervisores en BD y envia WhatsApp con foto a cada uno."""
        alias = payload.get("alias", "Desconocido")
        site_id = payload.get("site_id", "?")
        cam_id = payload.get("cam_id", "?")
        difference = payload.get("difference", 0)
        held_seconds = payload.get("held_seconds", 0)
        image_url = payload.get("image_url")  # ruta relativa: /static/gate-alerts/xxx.jpg
        ts = payload.get("ts", datetime.utcnow().isoformat())

        # Formatear tiempo abierto
        if held_seconds >= 3600:
            time_str = f"{held_seconds // 3600}h {(held_seconds % 3600) // 60} min"
        elif held_seconds >= 60:
            time_str = f"{held_seconds // 60} min"
        else:
            time_str = f"{held_seconds} seg"

        message = (
            "\u26a0\ufe0f ALERTA PORT\u00d3N \u26a0\ufe0f\n"
            f"{alias} lleva {time_str} abierto\n"
            f"Diferencia detectada: {difference}%\n"
            f"Sitio: {site_id} | C\u00e1mara: {cam_id}\n"
            f"{ts}"
        )

        # Construir URL absoluta de la evidencia fotografica
        media_url = None
        if image_url:
            media_url = f"{NEXTJS_DOMAIN}{image_url}"

        # Obtener supervisores de la BD
        supervisors = self._get_supervisors()
        if not supervisors:
            logger.warning("[Vision] No se encontraron supervisores activos")
            return

        sent_count = 0
        for sup in supervisors:
            telefono = sup.get("telefono", "").strip()
            if not telefono:
                continue
            try:
                self._send_whatsapp(telefono, message, media_url)
                sent_count += 1
            except Exception:
                logger.exception("[Vision] Error enviando WhatsApp a %s", telefono)

        # Registrar en log interno
        log_entry = {
            "ts": ts,
            "alias": alias,
            "site_id": site_id,
            "cam_id": cam_id,
            "difference": difference,
            "held_seconds": held_seconds,
            "image": bool(media_url),
            "supervisors_notified": sent_count,
            "processed_at": datetime.utcnow().isoformat(),
        }
        with self._lock:
            self._alert_log.append(log_entry)

        logger.info("[Vision] Alerta enviada a %d supervisores: %s (foto: %s)",
                    sent_count, alias, bool(media_url))

    def _get_supervisors(self) -> list[dict]:
        """Consulta la BD para obtener todos los supervisores activos."""
        conn = None
        cursor = None
        try:
            conn = db.get_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute(
                "SELECT registro, telefono, calle, nivel "
                "FROM autorizados "
                "WHERE estatus = 'activo' "
                "AND (nivel = 'supervisor' OR calle = 'supervisor')"
            )
            return cursor.fetchall()
        except Exception:
            logger.exception("[Vision] Error consultando supervisores")
            return []
        finally:
            if cursor:
                try:
                    cursor.close()
                except Exception:
                    pass
            if conn:
                try:
                    conn.close()
                except Exception:
                    pass

    def _send_whatsapp(self, telefono: str, body: str, media_url: str = None):
        """Envia mensaje WhatsApp via Twilio REST API, con imagen opcional."""
        if not self._twilio_client or not self._twilio_phone:
            logger.error("[Vision] Twilio client/phone no configurado")
            return

        from_ = self._twilio_phone
        if not from_.startswith("whatsapp:"):
            from_ = f"whatsapp:{from_}"

        kwargs = {
            "body": body,
            "from_": from_,
            "to": f"whatsapp:+{telefono}",
        }

        # Adjuntar evidencia fotografica si existe
        if media_url:
            kwargs["media_url"] = [media_url]

        self._twilio_client.messages.create(**kwargs)

    # ------------------------------------------------------------------
    # Intent: estado_portones
    # ------------------------------------------------------------------

    def _handle_estado_portones(self) -> CommandResult:
        """Consulta el estado actual de los portones via API Next.js."""
        try:
            resp = requests.get(GATE_STATUS_URL, timeout=10)
            resp.raise_for_status()
            data = resp.json()
        except requests.exceptions.ConnectionError:
            return CommandResult(
                text="No se pudo conectar con el servidor de video. "
                     "Verifique que el servicio este activo."
            )
        except requests.exceptions.Timeout:
            return CommandResult(text="El servidor de video no respondio a tiempo.")
        except Exception:
            logger.exception("[Vision] Error consultando estado de portones")
            return CommandResult(text="Error al consultar el estado de los portones.")

        gates = data if isinstance(data, list) else data.get("gates", data.get("data", []))

        if not gates:
            return CommandResult(
                text="No hay portones configurados o el sistema no reporta estado."
            )

        lines = ["\U0001f6e1\ufe0f *Estado de Portones*\n"]
        for gate in gates:
            name = gate.get("alias") or gate.get("name", "Sin nombre")
            state = gate.get("state", "desconocido")

            if state == "open":
                icon = "\U0001f534"
                lines.append(f"{icon} {name}: *ABIERTO*")
            elif state == "closed":
                icon = "\U0001f7e2"
                lines.append(f"{icon} {name}: Cerrado")
            elif state == "no-signal":
                icon = "\u26aa"
                lines.append(f"{icon} {name}: Sin se\u00f1al")
            else:
                icon = "\u2753"
                lines.append(f"{icon} {name}: {state}")

        return CommandResult(text="\n".join(lines))

    # ------------------------------------------------------------------
    # Ruta HTTP: POST /api/vision/alert (pruebas manuales)
    # ------------------------------------------------------------------

    def _route_manual_alert(self):
        """Endpoint HTTP para disparar una alerta manualmente (testing)."""
        try:
            payload = flask_request.get_json(force=True)
        except Exception:
            return jsonify({"error": "JSON invalido"}), 400

        if not payload:
            return jsonify({"error": "Body vacio"}), 400

        payload.setdefault("type", "gate_alert")
        payload.setdefault("ts", datetime.utcnow().isoformat())

        required = ["site_id", "cam_id", "alias"]
        missing = [f for f in required if f not in payload]
        if missing:
            return jsonify({"error": f"Campos faltantes: {missing}"}), 400

        # Procesar sin throttle para testing
        threading.Thread(
            target=self._process_alert,
            args=(payload,),
            daemon=True,
        ).start()

        return jsonify({
            "status": "ok",
            "message": "Alerta en proceso de envio",
        }), 202
