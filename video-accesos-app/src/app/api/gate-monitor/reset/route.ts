import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { resetZoneState } from "@/lib/gate-monitor";

/**
 * POST /api/gate-monitor/reset?zone_id=xxx
 * Resetea el contador consecutivo y alertSent de una zona.
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const zoneId = searchParams.get("zone_id");

  if (!zoneId) {
    return NextResponse.json({ error: "Se requiere zone_id" }, { status: 400 });
  }

  resetZoneState(zoneId);
  return NextResponse.json({ ok: true, message: "Contador reseteado" });
}
