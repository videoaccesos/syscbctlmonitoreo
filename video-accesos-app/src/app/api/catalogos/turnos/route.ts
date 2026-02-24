import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/catalogos/turnos - Listar turnos con busqueda y paginacion
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const skip = (page - 1) * limit;

    const where = {
      estatusId: 1,
      ...(search
        ? {
            descripcion: {
              contains: search,
            },
          }
        : {}),
    };

    const [turnos, total] = await Promise.all([
      prisma.turno.findMany({
        where,
        orderBy: { descripcion: "asc" },
        skip,
        take: limit,
      }),
      prisma.turno.count({ where }),
    ]);

    return NextResponse.json({
      data: turnos,
      total,
      page,
      limit,
    });
  } catch (error) {
    console.error("Error al listar turnos:", error);
    return NextResponse.json(
      { error: "Error al obtener turnos" },
      { status: 500 }
    );
  }
}

// POST /api/catalogos/turnos - Crear nuevo turno
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();

    // Validacion basica
    if (!body.descripcion || body.descripcion.trim() === "") {
      return NextResponse.json(
        { error: "La descripcion es requerida" },
        { status: 400 }
      );
    }

    // Verificar duplicado
    const existente = await prisma.turno.findFirst({
      where: {
        descripcion: body.descripcion.trim(),
        estatusId: 1,
      },
    });

    if (existente) {
      return NextResponse.json(
        { error: "Ya existe un turno con esa descripcion" },
        { status: 409 }
      );
    }

    const turno = await prisma.turno.create({
      data: {
        descripcion: body.descripcion.trim(),
        puestoId: body.puestoId ? parseInt(body.puestoId, 10) : null,
        estatusId: 1,
      },
    });

    return NextResponse.json(turno, { status: 201 });
  } catch (error) {
    console.error("Error al crear turno:", error);
    return NextResponse.json(
      { error: "Error al crear turno" },
      { status: 500 }
    );
  }
}
