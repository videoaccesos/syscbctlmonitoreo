import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getAgentStatuses, isMqttConnected } from "@/lib/mqtt-client";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/gate-monitor/agents
 * Devuelve el estado de los agentes de captura conectados via MQTT.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const mqttConnected = isMqttConnected();
  const agents = getAgentStatuses();

  // Enriquecer con nombres de privadas
  const siteIds = agents.map(a => parseInt(a.siteId)).filter(id => !isNaN(id));
  const privadas = siteIds.length > 0
    ? await prisma.privada.findMany({
        where: { id: { in: siteIds } },
        select: { id: true, descripcion: true },
      })
    : [];
  const privadaMap = new Map(privadas.map(p => [String(p.id), p.descripcion]));

  const enrichedAgents = agents.map(a => ({
    ...a,
    privadaName: privadaMap.get(a.siteId) || null,
  }));

  return NextResponse.json({
    ok: true,
    ts: new Date().toISOString(),
    mqttConnected,
    agents: enrichedAgents,
  });
}
