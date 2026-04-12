import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { listZoneStatuses, startGateMonitor, listGateConfigs } from "@/lib/gate-monitor";

/**
 * GET /api/gate-monitor/status
 * Retorna el estado actual de todas las zonas monitoreadas.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  // Iniciar monitor si hay configs con zonas que tengan referencia
  const configs = listGateConfigs();
  const hasActive = configs.some((c) =>
    c.zones.some((z) => z.enabled && z.referencePixelsB64)
  );
  if (hasActive) startGateMonitor();

  const statuses = listZoneStatuses();
  const totalZones = configs.reduce((sum, c) => sum + c.zones.length, 0);

  return NextResponse.json({
    ok: true,
    ts: new Date().toISOString(),
    cameras: configs.length,
    zones: totalZones,
    statuses,
  });
}
