import { NextRequest, NextResponse } from "next/server";
import { popCommands } from "@/lib/frame-store";
import { logger } from "@/lib/logger";
import { AGENT_TOKEN } from "@/lib/agent-config";

const TAG = "camera-poll";

/**
 * GET /api/camera-frames/poll?site_id=70
 *
 * El agente remoto hace polling a este endpoint cada ~2s para obtener
 * comandos pendientes (start_stream, stop_stream).
 * Autenticacion via header X-Agent-Token.
 */
export async function GET(request: NextRequest) {
  const token = request.headers.get("x-agent-token") || "";
  if (token !== AGENT_TOKEN) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const siteId = searchParams.get("site_id");

  if (!siteId) {
    return NextResponse.json({ error: "Se requiere site_id" }, { status: 400 });
  }

  const commands = popCommands(siteId);

  if (commands.length > 0) {
    logger.info(TAG, `Poll site=${siteId}: ${commands.length} comando(s) pendientes`);
  }

  return NextResponse.json({
    ok: true,
    site_id: siteId,
    commands,
  });
}
