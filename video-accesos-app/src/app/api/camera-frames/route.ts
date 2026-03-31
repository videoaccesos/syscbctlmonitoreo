import { NextRequest, NextResponse } from "next/server";
import { putFrame, getFrame } from "@/lib/frame-store";
import { logger } from "@/lib/logger";

const TAG = "camera-frames";

/**
 * POST /api/camera-frames
 *
 * Recibe un frame JPEG enviado por un agente remoto.
 * Headers requeridos:
 *   X-Site-Id:    ID de la privada/sitio
 *   X-Cam-Id:     Numero de camara (1, 2, 3)
 *   X-Agent-Token: Token de autenticacion del agente
 *   Content-Type:  image/jpeg
 * Headers opcionales:
 *   X-Agent-Host:  Hostname del equipo agente
 *   X-Agent-Fps:   FPS actual de captura
 *
 * Body: raw JPEG bytes
 */
export async function POST(request: NextRequest) {
  try {
    // --- Autenticacion del agente ---
    const agentToken = request.headers.get("x-agent-token");
    const expectedToken = process.env.CAMERA_AGENT_TOKEN;

    if (!expectedToken) {
      logger.error(TAG, "CAMERA_AGENT_TOKEN no configurado en el servidor");
      return NextResponse.json(
        { error: "Server misconfigured" },
        { status: 500 }
      );
    }

    if (!agentToken || agentToken !== expectedToken) {
      logger.warn(TAG, "Token de agente invalido o ausente");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // --- Validar headers ---
    const siteId = request.headers.get("x-site-id");
    const camIdRaw = request.headers.get("x-cam-id");

    if (!siteId || !camIdRaw) {
      return NextResponse.json(
        { error: "Se requieren headers X-Site-Id y X-Cam-Id" },
        { status: 400 }
      );
    }

    const camId = parseInt(camIdRaw);
    if (isNaN(camId) || camId < 1 || camId > 16) {
      return NextResponse.json(
        { error: "X-Cam-Id debe ser entre 1 y 16" },
        { status: 400 }
      );
    }

    // --- Leer body JPEG ---
    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("image/")) {
      return NextResponse.json(
        { error: "Content-Type debe ser image/jpeg" },
        { status: 400 }
      );
    }

    const arrayBuf = await request.arrayBuffer();
    const data = Buffer.from(arrayBuf);

    if (data.length < 100) {
      return NextResponse.json(
        { error: "Frame demasiado pequeno" },
        { status: 400 }
      );
    }

    if (data.length > 2_000_000) {
      return NextResponse.json(
        { error: "Frame demasiado grande (max 2MB)" },
        { status: 413 }
      );
    }

    // --- Guardar en frame store ---
    const agentHost = request.headers.get("x-agent-host") || undefined;
    const fps = parseFloat(request.headers.get("x-agent-fps") || "0") || undefined;

    putFrame(siteId, camId, data, {
      contentType: "image/jpeg",
      agentHost,
      fps,
    });

    logger.debug(TAG, `Frame recibido: site=${siteId} cam=${camId} ${data.length} bytes host=${agentHost || "?"}`);

    return NextResponse.json({
      ok: true,
      site_id: siteId,
      cam_id: camId,
      bytes: data.length,
      ts: new Date().toISOString(),
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error(TAG, "Error procesando frame", { error: msg });
    return NextResponse.json(
      { error: "Error interno", detail: msg },
      { status: 500 }
    );
  }
}

/**
 * GET /api/camera-frames?site_id=X&cam_id=N
 *
 * Devuelve el ultimo frame almacenado para un sitio/camara.
 * Uso directo para debug - en produccion el camera-proxy lo consume internamente.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const siteId = searchParams.get("site_id");
  const camIdRaw = searchParams.get("cam_id");

  if (!siteId || !camIdRaw) {
    return NextResponse.json(
      { error: "Se requieren site_id y cam_id" },
      { status: 400 }
    );
  }

  const camId = parseInt(camIdRaw);
  const frame = getFrame(siteId, camId);

  if (!frame) {
    return NextResponse.json(
      { error: "No hay frame disponible", site_id: siteId, cam_id: camId },
      { status: 404 }
    );
  }

  return new NextResponse(new Uint8Array(frame.data), {
    status: 200,
    headers: {
      "Content-Type": frame.contentType,
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "X-Frame-Age-Ms": String(Date.now() - frame.receivedAt),
      "X-Site-Id": frame.siteId,
      "X-Cam-Id": String(frame.camId),
      "X-Agent-Host": frame.agentHost || "",
    },
  });
}
