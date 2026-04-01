import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { captureReference, getGateConfig, startGateMonitor } from "@/lib/gate-monitor";

/**
 * POST /api/gate-monitor/reference?site_id=72&cam_id=3&zone_id=xxx
 * Captura la imagen de referencia para una zona especifica.
 *
 * GET /api/gate-monitor/reference?site_id=72&cam_id=3&zone_id=xxx
 * Obtiene la imagen de referencia de una zona en base64.
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const siteId = searchParams.get("site_id");
  const camId = searchParams.get("cam_id");
  const zoneId = searchParams.get("zone_id");

  if (!siteId || !camId || !zoneId) {
    return NextResponse.json({ error: "Se requieren site_id, cam_id y zone_id" }, { status: 400 });
  }

  const result = await captureReference(siteId, parseInt(camId), zoneId);
  if (result.ok) startGateMonitor();

  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const siteId = searchParams.get("site_id");
  const camId = searchParams.get("cam_id");
  const zoneId = searchParams.get("zone_id");

  if (!siteId || !camId || !zoneId) {
    return NextResponse.json({ error: "Se requieren site_id, cam_id y zone_id" }, { status: 400 });
  }

  const config = getGateConfig(siteId, parseInt(camId));
  if (!config) return NextResponse.json({ error: "Config no encontrada" }, { status: 404 });

  const zone = config.zones.find((z) => z.id === zoneId);
  if (!zone || !zone.referenceImageB64) {
    return NextResponse.json({ error: "No hay referencia capturada para esta zona" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    site_id: siteId,
    cam_id: camId,
    zone_id: zoneId,
    alias: zone.alias,
    image_b64: zone.referenceImageB64,
  });
}
