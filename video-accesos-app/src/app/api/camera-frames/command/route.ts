import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { clearSiteFrames } from "@/lib/frame-store";

const TAG = "camera-cmd";

/**
 * POST /api/camera-frames/command
 *
 * Envia comandos start_stream / stop_stream a un agente remoto via MQTT.
 * El comando se publica al broker MQTT en el topico:
 *   site/{site_id}/cam/{cam_id}/cmd
 *
 * Body JSON:
 *   {
 *     "site_id": "5",
 *     "cam_id": 1,          // opcional, 0 = todas las camaras del sitio
 *     "cmd": "start_stream", // o "stop_stream"
 *     "fps": 2,              // opcional, default 2
 *     "duration": 120,       // opcional, segundos, default 120
 *     "quality": 55,         // opcional, JPEG quality 1-100, default 55
 *     "width": 640           // opcional, ancho en px, default 640
 *   }
 *
 * El comando se envia al broker MQTT via el Bot Orquestador o via
 * publicacion directa, segun configuracion.
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { site_id, cam_id, cmd, fps, duration, quality, width } = body;

    if (!site_id || !cmd) {
      return NextResponse.json(
        { error: "Se requieren site_id y cmd" },
        { status: 400 }
      );
    }

    if (cmd !== "start_stream" && cmd !== "stop_stream") {
      return NextResponse.json(
        { error: "cmd debe ser start_stream o stop_stream" },
        { status: 400 }
      );
    }

    // Construir payload MQTT
    const camTarget = cam_id || 0; // 0 = todas
    const topic = camTarget > 0
      ? `site/${site_id}/cam/${camTarget}/cmd`
      : `site/${site_id}/agent/cmd`;

    const payload: Record<string, unknown> = { cmd };

    if (cmd === "start_stream") {
      payload.fps = fps || 2;
      payload.duration = duration || 120;
      payload.quality = quality || 55;
      payload.width = width || 640;
    }

    if (cmd === "stop_stream") {
      // Limpiar frames del store para este sitio
      clearSiteFrames(String(site_id));
    }

    logger.info(TAG, `Comando: ${cmd} -> topic=${topic}`, payload);

    // --- Publicar al broker MQTT ---
    // Usamos el endpoint del Bot Orquestador que ya maneja MQTT
    const mqttBrokerUrl = process.env.MQTT_PUBLISH_URL;
    const mqttApiKey = process.env.MQTT_API_KEY || "";

    if (mqttBrokerUrl) {
      // Publicar via API HTTP del broker/orquestador
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (mqttApiKey) {
        headers["X-API-Key"] = mqttApiKey;
      }

      try {
        const mqttRes = await fetch(mqttBrokerUrl, {
          method: "POST",
          headers,
          body: JSON.stringify({
            topic,
            payload: JSON.stringify(payload),
            qos: 1,
          }),
          signal: AbortSignal.timeout(10000),
        });

        if (!mqttRes.ok) {
          const errText = await mqttRes.text().catch(() => "");
          logger.warn(TAG, `MQTT publish error: HTTP ${mqttRes.status} ${errText}`);
          return NextResponse.json({
            ok: false,
            error: "Error al publicar comando MQTT",
            mqtt_status: mqttRes.status,
            topic,
          }, { status: 502 });
        }

        logger.info(TAG, `MQTT publicado OK: ${topic} -> ${JSON.stringify(payload)}`);
      } catch (fetchErr) {
        const msg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
        logger.error(TAG, `MQTT publish fetch error: ${msg}`);
        return NextResponse.json({
          ok: false,
          error: `Error de conexion al broker: ${msg}`,
          topic,
        }, { status: 502 });
      }
    } else {
      // Sin MQTT configurado - registrar el comando para referencia
      // En produccion, configurar MQTT_PUBLISH_URL
      logger.warn(TAG, `MQTT no configurado (MQTT_PUBLISH_URL vacio). Comando registrado localmente: ${topic} -> ${JSON.stringify(payload)}`);
    }

    return NextResponse.json({
      ok: true,
      topic,
      payload,
      ts: new Date().toISOString(),
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error(TAG, "Error procesando comando", { error: msg });
    return NextResponse.json(
      { error: "Error interno", detail: msg },
      { status: 500 }
    );
  }
}
