import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { testComparison } from "@/lib/gate-monitor";

/**
 * POST /api/gate-monitor/test?site_id=72&cam_id=3&zone_id=xxx
 * Captura un frame en vivo, compara con la referencia y retorna diagnóstico.
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

  const result = await testComparison(siteId, parseInt(camId), zoneId);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
