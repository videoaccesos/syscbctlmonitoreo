import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { clearSiteFrames, addViewer, removeViewer, getViewerCount, pushCommand } from "@/lib/frame-store";

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
    let shouldPublish = true;

    if (cmd === "start_stream") {
      const viewers = addViewer(String(site_id));
      payload.fps = fps || 2;
      payload.duration = duration || 600;
      payload.quality = quality || 55;
      payload.width = width || 640;
      // Si ya habia viewers, el agente ya esta transmitiendo - no reenviar
      if (viewers > 1) {
        logger.info(TAG, `start_stream site=${site_id} - ya hay ${viewers} viewers, no reenviar comando`);
        shouldPublish = false;
      }
    }

    if (cmd === "stop_stream") {
      const remaining = removeViewer(String(site_id));
      if (remaining > 0) {
        // Otros operadores aun necesitan el video - no detener
        logger.info(TAG, `stop_stream site=${site_id} - quedan ${remaining} viewers, NO detener agente`);
        return NextResponse.json({
          ok: true,
          skipped: true,
          reason: `${remaining} viewer(s) aun activos`,
          topic,
          ts: new Date().toISOString(),
        });
      }
      // Ultimo viewer - si detener
      clearSiteFrames(String(site_id));
    }

    logger.info(TAG, `Comando: ${cmd} -> topic=${topic} publish=${shouldPublish} viewers=${getViewerCount(String(site_id))}`, payload);

    // Si no hay que publicar (ya habia viewers activos), retornar OK
    if (!shouldPublish) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        reason: "Agent already streaming for other viewers",
        topic,
        ts: new Date().toISOString(),
      });
    }

    // --- Encolar comando para que el agente lo recoja via polling HTTP ---
    pushCommand(String(site_id), {
      cmd,
      fps: payload.fps as number | undefined,
      duration: payload.duration as number | undefined,
      quality: payload.quality as number | undefined,
      width: payload.width as number | undefined,
      cam_id: camTarget > 0 ? camTarget : undefined,
      ts: Date.now(),
    });

    logger.info(TAG, `Comando encolado para polling: site=${site_id} -> ${JSON.stringify(payload)}`);

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
