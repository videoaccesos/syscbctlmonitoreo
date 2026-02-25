import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/procesos/registro-accesos/buscar-solicitante
// Busca solicitantes en las 3 tablas: residentes, visitantes y registros generales
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") || "";
    const residenciaId = searchParams.get("residenciaId");
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    if (!q || q.length < 1) {
      return NextResponse.json({ data: [] });
    }

    const results: Array<{
      id: string;
      nombre: string;
      tipo: "R" | "V" | "G";
      tipoLabel: string;
      celular: string;
      observaciones: string;
    }> = [];

    // 1. Buscar en residentes
    const residenteWhere: Record<string, unknown> = {
      estatusId: 1,
      OR: [
        { nombre: { contains: q } },
        { apePaterno: { contains: q } },
        { apeMaterno: { contains: q } },
      ],
    };
    if (residenciaId) {
      residenteWhere.residenciaId = parseInt(residenciaId, 10);
    }

    const residentes = await prisma.residente.findMany({
      where: residenteWhere,
      select: {
        id: true,
        nombre: true,
        apePaterno: true,
        apeMaterno: true,
        celular: true,
      },
      take: limit,
      orderBy: { apePaterno: "asc" },
    });

    for (const r of residentes) {
      results.push({
        id: r.id,
        nombre: `${r.nombre} ${r.apePaterno} ${r.apeMaterno}`.trim(),
        tipo: "R",
        tipoLabel: "Residente",
        celular: r.celular || "",
        observaciones: "",
      });
    }

    // 2. Buscar en visitantes
    const visitanteWhere: Record<string, unknown> = {
      estatusId: 1,
      OR: [
        { nombre: { contains: q } },
        { apePaterno: { contains: q } },
        { apeMaterno: { contains: q } },
      ],
    };
    if (residenciaId) {
      visitanteWhere.residenciaId = parseInt(residenciaId, 10);
    }

    const visitantes = await prisma.visita.findMany({
      where: visitanteWhere,
      select: {
        id: true,
        nombre: true,
        apePaterno: true,
        apeMaterno: true,
        celular: true,
        observaciones: true,
      },
      take: limit,
      orderBy: { apePaterno: "asc" },
    });

    for (const v of visitantes) {
      results.push({
        id: v.id,
        nombre: `${v.nombre} ${v.apePaterno} ${v.apeMaterno}`.trim(),
        tipo: "V",
        tipoLabel: "Visitante",
        celular: v.celular || "",
        observaciones: v.observaciones || "",
      });
    }

    // 3. Buscar en registros generales
    const generales = await prisma.registroGeneral.findMany({
      where: {
        estatusId: 1,
        OR: [
          { nombre: { contains: q } },
          { apePaterno: { contains: q } },
          { apeMaterno: { contains: q } },
        ],
      },
      select: {
        id: true,
        nombre: true,
        apePaterno: true,
        apeMaterno: true,
        celular: true,
        observaciones: true,
      },
      take: limit,
      orderBy: { apePaterno: "asc" },
    });

    for (const g of generales) {
      results.push({
        id: g.id,
        nombre: `${g.nombre} ${g.apePaterno} ${g.apeMaterno}`.trim(),
        tipo: "G",
        tipoLabel: "General",
        celular: g.celular || "",
        observaciones: g.observaciones || "",
      });
    }

    return NextResponse.json({ data: results });
  } catch (error) {
    console.error("Error al buscar solicitantes:", error);
    return NextResponse.json(
      { error: "Error al buscar solicitantes" },
      { status: 500 }
    );
  }
}
