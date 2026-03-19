import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/procesos/registro-accesos/buscar-residencia - Buscar residencias por privada
// Búsqueda ligera: solo datos básicos de la residencia (sin residentes/visitantes)
// Los detalles completos se cargan con el endpoint detalle-residencia al seleccionar
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const privadaId = searchParams.get("privadaId");
    const search = searchParams.get("search") || "";

    if (!privadaId) {
      return NextResponse.json(
        { error: "El parametro privadaId es requerido" },
        { status: 400 }
      );
    }

    const privadaIdNum = parseInt(privadaId, 10);
    if (isNaN(privadaIdNum)) {
      return NextResponse.json(
        { error: "privadaId debe ser un numero valido" },
        { status: 400 }
      );
    }

    // Si no hay texto de búsqueda, no retornar nada
    // (evita cargar cientos de residencias al seleccionar la privada)
    if (!search.trim()) {
      return NextResponse.json({ data: [], total: 0 });
    }

    // Construir filtro de busqueda
    const where: Record<string, unknown> = {
      privadaId: privadaIdNum,
      estatusId: { in: [1, 2, 3] },
      OR: [
        { nroCasa: { contains: search } },
        { calle: { contains: search } },
      ],
    };

    const residencias = await prisma.residencia.findMany({
      where,
      select: {
        id: true,
        nroCasa: true,
        calle: true,
        interfon: true,
        estatusId: true,
        observaciones: true,
      },
      orderBy: { nroCasa: "asc" },
      take: 20,
    });

    return NextResponse.json({
      data: residencias,
      total: residencias.length,
    });
  } catch (error) {
    console.error("Error al buscar residencias:", error);
    return NextResponse.json(
      { error: "Error al buscar residencias" },
      { status: 500 }
    );
  }
}
