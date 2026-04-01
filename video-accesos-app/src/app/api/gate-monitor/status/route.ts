import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { listGateStatuses, startGateMonitor, listGateConfigs } from "@/lib/gate-monitor";

/**
 * GET /api/gate-monitor/status
 * Retorna el estado actual de todos los portones monitoreados.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  // Iniciar monitor si hay configs activas
  const configs = listGateConfigs();
  if (configs.some(c => c.enabled && c.referenceHistogram)) {
    startGateMonitor();
  }

  const statuses = listGateStatuses();

  return NextResponse.json({
    ok: true,
    ts: new Date().toISOString(),
    monitors: configs.length,
    active: configs.filter(c => c.enabled).length,
    statuses,
  });
}
