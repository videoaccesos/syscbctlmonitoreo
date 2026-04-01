import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { clearSiteFrames, addViewer, removeViewer, getViewerCount, pushCommand } from "@/lib/frame-store";
import { publishCommand, isMqttConnected } from "@/lib/mqtt-client";

const TAG = "camera-cmd";

/**
 * POST /api/camera-frames/command
 *
 * Envia comandos start_stream / stop_stream a un agente remoto.
 * Via principal: MQTT (topico videoaccesos/{site_id}/cmd)
 * Fallback: HTTP polling (para agentes que aun no usen MQTT)
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { site_id, cam_id, cmd, fps, duration, quality, width, mode } = body;

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

    const camTarget = cam_id || 0;
    const payload: Record<string, unknown> = { cmd };

    if (cmd === "start_stream") {
      const currentViewers = getViewerCount(String(site_id));
      if (currentViewers === 0) {
        addViewer(String(site_id));
      }
      payload.fps = fps || 25;
      payload.duration = duration ?? 0;
      payload.quality = quality || 55;
      payload.width = width || 640;
    }

    if (cmd === "stop_stream") {
      const remaining = removeViewer(String(site_id));
      if (remaining > 0) {
        logger.info(TAG, `stop_stream site=${site_id} - quedan ${remaining} viewers, NO detener agente`);
        return NextResponse.json({
          ok: true,
          skipped: true,
          reason: `${remaining} viewer(s) aun activos`,
          ts: new Date().toISOString(),
        });
      }
      clearSiteFrames(String(site_id));
    }

    // Agregar cam_id y mode al payload
    if (camTarget > 0) payload.cam_id = camTarget;
    if (mode) payload.mode = mode;

    // --- Via 1: MQTT (instantaneo) ---
    const mqttOk = publishCommand(String(site_id), payload);

    // --- Via 2: HTTP polling (fallback para agentes sin MQTT) ---
    pushCommand(String(site_id), {
      cmd,
      fps: payload.fps as number | undefined,
      duration: payload.duration as number | undefined,
      quality: payload.quality as number | undefined,
      width: payload.width as number | undefined,
      cam_id: camTarget > 0 ? camTarget : undefined,
      mode: mode as string | undefined,
      ts: Date.now(),
    });

    logger.info(TAG, `Comando: ${cmd} site=${site_id} mqtt=${mqttOk} viewers=${getViewerCount(String(site_id))}`);

    return NextResponse.json({
      ok: true,
      mqtt: mqttOk,
      mqtt_connected: isMqttConnected(),
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
