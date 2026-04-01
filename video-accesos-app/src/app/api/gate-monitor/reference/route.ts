import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { captureReference, getGateConfig, startGateMonitor } from "@/lib/gate-monitor";

/**
 * POST /api/gate-monitor/reference?site_id=72&cam_id=3
 * Captura la imagen de referencia ("porton cerrado") del frame actual.
 *
 * GET /api/gate-monitor/reference?site_id=72&cam_id=3
 * Obtiene la imagen de referencia en base64.
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const siteId = searchParams.get("site_id");
  const camId = searchParams.get("cam_id");

  if (!siteId || !camId) {
    return NextResponse.json({ error: "Se requieren site_id y cam_id" }, { status: 400 });
  }

  const result = await captureReference(siteId, parseInt(camId));

  if (result.ok) {
    startGateMonitor();
  }

  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const siteId = searchParams.get("site_id");
  const camId = searchParams.get("cam_id");

  if (!siteId || !camId) {
    return NextResponse.json({ error: "Se requieren site_id y cam_id" }, { status: 400 });
  }

  const config = getGateConfig(siteId, parseInt(camId));
  if (!config || !config.referenceImageB64) {
    return NextResponse.json({ error: "No hay referencia capturada" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    site_id: siteId,
    cam_id: camId,
    image_b64: config.referenceImageB64,
  });
}
