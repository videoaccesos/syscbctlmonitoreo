import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/procesos/registro-accesos/buscar-residencia - Buscar residencias por privada para el formulario de registro
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

    // Construir filtro de busqueda
    const where: Record<string, unknown> = {
      privadaId: privadaIdNum,
      estatusId: { in: [1, 2, 3] }, // Incluir todas las residencias activas (1=Activo, 2=Sin Interfon, 3=Moroso)
    };

    if (search) {
      where.OR = [
        { nroCasa: { contains: search } },
        { calle: { contains: search } },
      ];
    }

    const residencias = await prisma.residencia.findMany({
      where,
      select: {
        id: true,
        nroCasa: true,
        calle: true,
        telefono1: true,
        telefono2: true,
        interfon: true,
        telefonoInterfon: true,
        observaciones: true,
        estatusId: true,
        residentes: {
          where: { estatusId: 1 }, // Solo residentes activos
          select: {
            id: true,
            nombre: true,
            apePaterno: true,
            apeMaterno: true,
            celular: true,
            email: true,
            reportarAcceso: true,
          },
          orderBy: { apePaterno: "asc" },
        },
        visitantes: {
          where: { estatusId: 1 }, // Solo visitantes activos
          select: {
            id: true,
            nombre: true,
            apePaterno: true,
            apeMaterno: true,
            telefono: true,
            celular: true,
            observaciones: true,
          },
          orderBy: { apePaterno: "asc" },
        },
      },
      orderBy: { nroCasa: "asc" },
      take: 50, // Limitar resultados para rendimiento
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
