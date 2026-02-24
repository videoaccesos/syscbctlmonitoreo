import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/catalogos/tarjetas - Listar tarjetas con busqueda, filtros y paginacion
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const tipoId = searchParams.get("tipoId");
    const estatusId = searchParams.get("estatusId");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    // Filtro por tipoId (1=Peatonal, 2=Vehicular)
    if (tipoId) {
      const tipo = parseInt(tipoId, 10);
      if (!isNaN(tipo)) {
        where.tipoId = tipo;
      }
    }

    // Filtro por estatusId (1=Activa, 2=Asignada, 3=Danada, 4=Consignacion, 5=Baja)
    if (estatusId) {
      const estatus = parseInt(estatusId, 10);
      if (!isNaN(estatus)) {
        where.estatusId = estatus;
      }
    }

    // Busqueda por lectura
    if (search) {
      where.lectura = { contains: search };
    }

    const [tarjetas, total] = await Promise.all([
      prisma.tarjeta.findMany({
        where,
        orderBy: { fecha: "desc" },
        skip,
        take: limit,
      }),
      prisma.tarjeta.count({ where }),
    ]);

    return NextResponse.json({
      data: tarjetas,
      total,
      page,
      limit,
    });
  } catch (error) {
    console.error("Error al listar tarjetas:", error);
    return NextResponse.json(
      { error: "Error al obtener tarjetas" },
      { status: 500 }
    );
  }
}

// POST /api/catalogos/tarjetas - Crear nueva tarjeta
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();

    // Validacion basica
    if (!body.lectura || body.lectura.trim() === "") {
      return NextResponse.json(
        { error: "La lectura es requerida" },
        { status: 400 }
      );
    }

    if (!body.tipoId) {
      return NextResponse.json(
        { error: "El tipo es requerido (1=Peatonal, 2=Vehicular)" },
        { status: 400 }
      );
    }

    const tipoId = parseInt(body.tipoId, 10);
    if (![1, 2].includes(tipoId)) {
      return NextResponse.json(
        { error: "El tipo debe ser 1 (Peatonal) o 2 (Vehicular)" },
        { status: 400 }
      );
    }

    // Verificar duplicado por lectura
    const existente = await prisma.tarjeta.findFirst({
      where: {
        lectura: body.lectura.trim(),
      },
    });

    if (existente) {
      return NextResponse.json(
        { error: "Ya existe una tarjeta con esa lectura" },
        { status: 409 }
      );
    }

    const tarjeta = await prisma.tarjeta.create({
      data: {
        lectura: body.lectura.trim(),
        tipoId,
        estatusId: body.estatusId ? parseInt(body.estatusId, 10) : 1,
        fecha: body.fecha ? new Date(body.fecha) : new Date(),
      },
    });

    return NextResponse.json(tarjeta, { status: 201 });
  } catch (error) {
    console.error("Error al crear tarjeta:", error);
    return NextResponse.json(
      { error: "Error al crear tarjeta" },
      { status: 500 }
    );
  }
}
