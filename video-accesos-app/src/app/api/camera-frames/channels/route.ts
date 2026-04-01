import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { getSiteChannels, setSiteChannels, listActiveFrames } from "@/lib/frame-store";
import { AGENT_TOKEN } from "@/lib/agent-config";

const TAG = "camera-channels";

/**
 * POST /api/camera-frames/channels
 * El agente reporta los canales disponibles del DVR.
 *
 * GET /api/camera-frames/channels?site_id=66
 * Devuelve los canales disponibles para un sitio (requiere sesion).
 */
export async function POST(request: NextRequest) {
  const token = request.headers.get("x-agent-token") || "";
  if (token !== AGENT_TOKEN) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { site_id, channels } = body;

    if (!site_id || !Array.isArray(channels)) {
      return NextResponse.json({ error: "Se requieren site_id y channels" }, { status: 400 });
    }

    setSiteChannels(String(site_id), channels);
    logger.info(TAG, `Site ${site_id}: ${channels.length} canales reportados por agente`);

    return NextResponse.json({
      ok: true,
      site_id,
      channels_count: channels.length,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error(TAG, `Error: ${msg}`);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  // Auth via session o agent token
  const token = request.headers.get("x-agent-token") || "";
  if (token !== AGENT_TOKEN) {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
  }

  const { searchParams } = new URL(request.url);
  const siteId = searchParams.get("site_id");

  if (!siteId) {
    return NextResponse.json({ error: "Se requiere site_id" }, { status: 400 });
  }

  let channels = getSiteChannels(siteId);

  // Si no hay canales reportados, construir lista a partir de frames activos
  if (!channels || channels.length === 0) {
    const activeFrames = listActiveFrames().filter((f) => f.siteId === siteId);
    if (activeFrames.length > 0) {
      channels = activeFrames
        .map((f) => ({
          channel: f.camId,
          code: `${f.camId}02`,
          alias: `Canal ${f.camId}`,
          bytes: f.bytes,
        }))
        .sort((a, b) => a.channel - b.channel);
    }
  }

  return NextResponse.json({
    ok: true,
    site_id: siteId,
    channels: channels || [],
  });
}
