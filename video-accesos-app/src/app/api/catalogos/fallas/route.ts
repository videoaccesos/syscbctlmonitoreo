import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/catalogos/fallas - Listar fallas con busqueda y paginacion
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
            OR: [
              { codigo: { contains: search } },
              { descripcion: { contains: search } },
            ],
          }
        : {}),
    };

    const [fallas, total] = await Promise.all([
      prisma.falla.findMany({
        where,
        orderBy: { codigo: "asc" },
        skip,
        take: limit,
      }),
      prisma.falla.count({ where }),
    ]);

    return NextResponse.json({
      data: fallas,
      total,
      page,
      limit,
    });
  } catch (error) {
    console.error("Error al listar fallas:", error);
    return NextResponse.json(
      { error: "Error al obtener fallas" },
      { status: 500 }
    );
  }
}

// POST /api/catalogos/fallas - Crear nueva falla
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();

    // Validacion basica
    if (!body.codigo || body.codigo.trim() === "") {
      return NextResponse.json(
        { error: "El codigo es requerido" },
        { status: 400 }
      );
    }

    if (!body.descripcion || body.descripcion.trim() === "") {
      return NextResponse.json(
        { error: "La descripcion es requerida" },
        { status: 400 }
      );
    }

    // Verificar duplicado por codigo
    const existente = await prisma.falla.findFirst({
      where: {
        codigo: body.codigo.trim(),
        estatusId: 1,
      },
    });

    if (existente) {
      return NextResponse.json(
        { error: "Ya existe una falla con ese codigo" },
        { status: 409 }
      );
    }

    const falla = await prisma.falla.create({
      data: {
        codigo: body.codigo.trim(),
        descripcion: body.descripcion.trim(),
        estatusId: 1,
        usuarioModId: 0,
      },
    });

    return NextResponse.json(falla, { status: 201 });
  } catch (error) {
    console.error("Error al crear falla:", error);
    return NextResponse.json(
      { error: "Error al crear falla" },
      { status: 500 }
    );
  }
}
