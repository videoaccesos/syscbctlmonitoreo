import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getComparisonLog } from "@/lib/gate-monitor";

/**
 * GET /api/gate-monitor/comparisons?limit=200&site_id=72&zone_id=xxx
 * Devuelve el log de comparaciones (lecturas de monitoreo).
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") || "200");
  const siteId = searchParams.get("site_id") || undefined;
  const zoneId = searchParams.get("zone_id") || undefined;

  const records = getComparisonLog(limit, siteId, zoneId);

  return NextResponse.json({
    ok: true,
    ts: new Date().toISOString(),
    total: records.length,
    records,
  });
}
