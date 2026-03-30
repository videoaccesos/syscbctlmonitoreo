import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { listActiveFrames } from "@/lib/frame-store";

/**
 * GET /api/camera-frames/diag
 *
 * Endpoint de diagnostico - muestra todos los frames activos en el store.
 * Requiere sesion autenticada.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const active = listActiveFrames();

  return NextResponse.json({
    ts: new Date().toISOString(),
    active_frames: active.length,
    frames: active.map((f) => ({
      site_id: f.siteId,
      cam_id: f.camId,
      age_ms: f.ageMs,
      bytes: f.bytes,
      agent_host: f.agentHost,
    })),
  });
}
