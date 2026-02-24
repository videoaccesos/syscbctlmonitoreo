// NOTA: La tabla 'materiales' no existe en la BD legacy. Este endpoint queda como placeholder.
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/catalogos/materiales - Listar materiales con busqueda y paginacion
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

    const [materiales, total] = await Promise.all([
      prisma.material.findMany({
        where,
        orderBy: { codigo: "asc" },
        skip,
        take: limit,
      }),
      prisma.material.count({ where }),
    ]);

    return NextResponse.json({
      data: materiales,
      total,
      page,
      limit,
    });
  } catch (error) {
    console.error("Error al listar materiales:", error);
    return NextResponse.json(
      { error: "Error al obtener materiales" },
      { status: 500 }
    );
  }
}

// POST /api/catalogos/materiales - Crear nuevo material
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

    if (body.costo === undefined || body.costo === null) {
      return NextResponse.json(
        { error: "El costo es requerido" },
        { status: 400 }
      );
    }

    const costo = parseFloat(body.costo);
    if (isNaN(costo) || costo < 0) {
      return NextResponse.json(
        { error: "El costo debe ser un numero valido mayor o igual a 0" },
        { status: 400 }
      );
    }

    // Verificar duplicado por codigo
    const existente = await prisma.material.findFirst({
      where: {
        codigo: body.codigo.trim(),
        estatusId: 1,
      },
    });

    if (existente) {
      return NextResponse.json(
        { error: "Ya existe un material con ese codigo" },
        { status: 409 }
      );
    }

    const material = await prisma.material.create({
      data: {
        codigo: body.codigo.trim(),
        descripcion: body.descripcion.trim(),
        costo,
        estatusId: 1,
      },
    });

    return NextResponse.json(material, { status: 201 });
  } catch (error) {
    console.error("Error al crear material:", error);
    return NextResponse.json(
      { error: "Error al crear material" },
      { status: 500 }
    );
  }
}
