import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { listSitesWithChannels } from "@/lib/frame-store";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const videoOnly = searchParams.get("video") === "1";

  let whereClause: Record<string, unknown> = { estatusId: { in: [1, 2] } };

  // Si video=1, solo devolver privadas que tienen agente con canales reportados
  if (videoOnly) {
    const activeSites = listSitesWithChannels();
    const activeIds = activeSites.map((s) => parseInt(s.siteId)).filter((id) => !isNaN(id));
    if (activeIds.length === 0) {
      return NextResponse.json([]);
    }
    whereClause = { ...whereClause, id: { in: activeIds } };
  }

  const privadas = await prisma.privada.findMany({
    where: whereClause,
    select: { id: true, descripcion: true },
    orderBy: { descripcion: "asc" },
  });

  return NextResponse.json(privadas);
}
