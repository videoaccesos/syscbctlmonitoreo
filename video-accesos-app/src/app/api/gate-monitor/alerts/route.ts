import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getAlertHistory, getAlertStats } from "@/lib/gate-monitor";

/**
 * GET /api/gate-monitor/alerts?limit=50&siteId=xxx
 * Returns alert history and stats.
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limitParam = searchParams.get("limit");
  const siteId = searchParams.get("siteId") || undefined;

  const limit = limitParam ? parseInt(limitParam, 10) : 100;
  const alerts = getAlertHistory(limit, siteId);
  const stats = getAlertStats();

  return NextResponse.json({
    ok: true,
    ts: new Date().toISOString(),
    alerts,
    stats,
  });
}
