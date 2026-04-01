/**
 * Cliente MQTT singleton para comunicacion con agentes remotos.
 *
 * Arquitectura hibrida:
 *   - MQTT: comandos (start/stop), canales reportados, heartbeat (mensajes ligeros)
 *   - HTTP POST: frames JPEG (datos binarios grandes, ya funciona)
 *
 * Topicos:
 *   videoaccesos/{site_id}/cmd      -> Servidor publica comandos al agente
 *   videoaccesos/{site_id}/channels -> Agente publica canales descubiertos
 *   videoaccesos/{site_id}/status   -> Agente publica heartbeat / LWT offline
 */

import mqtt from "mqtt";
import { logger } from "@/lib/logger";
import { setSiteChannels } from "@/lib/frame-store";

const TAG = "mqtt-client";

// --- Configuracion del broker ---
const BROKER_URL = process.env.MQTT_BROKER_URL || "mqtt://50.62.182.131:1883";
const BROKER_USER = process.env.MQTT_USER || "admin";
const BROKER_PASS = process.env.MQTT_PASSWORD || "v1de0acces0s";
const TOPIC_PREFIX = "videoaccesos";

// --- Singleton ---
let client: mqtt.MqttClient | null = null;
let connecting = false;

// Agentes conectados: site_id -> ultimo status
const agentStatus = new Map<string, { online: boolean; lastSeen: number; host?: string }>();

function getClient(): mqtt.MqttClient {
  if (client && client.connected) return client;
  if (connecting) return client!;
  connecting = true;

  logger.info(TAG, `Conectando a broker MQTT: ${BROKER_URL}`);

  client = mqtt.connect(BROKER_URL, {
    username: BROKER_USER,
    password: BROKER_PASS,
    clientId: `videoaccesos-server-${process.pid}`,
    clean: true,
    keepalive: 30,
    reconnectPeriod: 5000,
    connectTimeout: 10000,
  });

  client.on("connect", () => {
    connecting = false;
    logger.info(TAG, "Conectado al broker MQTT");

    // Suscribirse a topicos de agentes
    client!.subscribe([
      `${TOPIC_PREFIX}/+/channels`,
      `${TOPIC_PREFIX}/+/status`,
    ], { qos: 0 }, (err) => {
      if (err) {
        logger.error(TAG, "Error al suscribirse", { error: err.message });
      } else {
        logger.info(TAG, "Suscrito a topicos de agentes");
      }
    });
  });

  client.on("message", (topic: string, payload: Buffer) => {
    try {
      handleMessage(topic, payload);
    } catch (err) {
      logger.error(TAG, `Error procesando mensaje MQTT: ${err instanceof Error ? err.message : err}`);
    }
  });

  client.on("error", (err: Error) => {
    connecting = false;
    logger.error(TAG, `Error MQTT: ${err.message}`);
  });

  client.on("reconnect", () => {
    logger.info(TAG, "Reconectando al broker MQTT...");
  });

  client.on("close", () => {
    connecting = false;
    logger.warn(TAG, "Conexion MQTT cerrada");
  });

  return client;
}

// --- Manejo de mensajes entrantes ---
function handleMessage(topic: string, payload: Buffer) {
  // Parsear topico: videoaccesos/{site_id}/{type}
  const parts = topic.split("/");
  if (parts.length !== 3 || parts[0] !== TOPIC_PREFIX) return;

  const siteId = parts[1];
  const msgType = parts[2];

  switch (msgType) {
    case "channels": {
      const data = JSON.parse(payload.toString());
      if (Array.isArray(data.channels)) {
        setSiteChannels(siteId, data.channels);
        logger.info(TAG, `Site ${siteId}: ${data.channels.length} canales via MQTT`);
      }
      break;
    }
    case "status": {
      const data = JSON.parse(payload.toString());
      const isOffline = data.state === "offline";
      agentStatus.set(siteId, {
        online: !isOffline,
        lastSeen: Date.now(),
        host: data.host,
      });
      if (isOffline) {
        logger.warn(TAG, `Site ${siteId}: agente OFFLINE (LWT)`);
      } else {
        logger.debug(TAG, `Site ${siteId}: heartbeat - state=${data.state} host=${data.host}`);
      }
      break;
    }
  }
}

// --- API publica ---

/** Publicar comando a un agente (start_stream, stop_stream) */
export function publishCommand(siteId: string, command: Record<string, unknown>): boolean {
  try {
    const c = getClient();
    const topic = `${TOPIC_PREFIX}/${siteId}/cmd`;
    const payload = JSON.stringify(command);
    c.publish(topic, payload, { qos: 0 });
    logger.info(TAG, `Comando publicado: ${topic} -> ${payload}`);
    return true;
  } catch (err) {
    logger.error(TAG, `Error publicando comando: ${err instanceof Error ? err.message : err}`);
    return false;
  }
}

/** Verificar si un agente esta conectado */
export function isAgentOnline(siteId: string): boolean {
  const status = agentStatus.get(siteId);
  if (!status) return false;
  // Considerar offline si no hay heartbeat en 90s
  return status.online && (Date.now() - status.lastSeen) < 90_000;
}

/** Obtener status de todos los agentes */
export function getAgentStatuses(): Array<{ siteId: string; online: boolean; lastSeen: number; host?: string }> {
  const result: Array<{ siteId: string; online: boolean; lastSeen: number; host?: string }> = [];
  for (const [siteId, status] of agentStatus) {
    result.push({
      siteId,
      online: status.online && (Date.now() - status.lastSeen) < 90_000,
      lastSeen: status.lastSeen,
      host: status.host,
    });
  }
  return result;
}

/** Inicializar conexion MQTT (llamar al arrancar el servidor) */
export function initMqtt(): void {
  getClient();
}

/** Verificar si MQTT esta conectado */
export function isMqttConnected(): boolean {
  return client?.connected || false;
}
