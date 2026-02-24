import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/catalogos/privadas - Listar privadas con busqueda y paginacion
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "10", 10);
    const skip = (page - 1) * pageSize;

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

    const [privadas, total] = await Promise.all([
      prisma.privada.findMany({
        where,
        orderBy: { descripcion: "asc" },
        skip,
        take: pageSize,
      }),
      prisma.privada.count({ where }),
    ]);

    return NextResponse.json({
      data: privadas,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error("Error al listar privadas:", error);
    return NextResponse.json(
      { error: "Error al obtener privadas" },
      { status: 500 }
    );
  }
}

// POST /api/catalogos/privadas - Crear nueva privada
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
    const existente = await prisma.privada.findFirst({
      where: {
        descripcion: body.descripcion.trim(),
        estatusId: 1,
      },
    });

    if (existente) {
      return NextResponse.json(
        { error: "Ya existe una privada con esa descripcion" },
        { status: 409 }
      );
    }

    const privada = await prisma.privada.create({
      data: {
        descripcion: body.descripcion.trim(),
        apePaterno: body.apePaterno?.trim() || null,
        apeMaterno: body.apeMaterno?.trim() || null,
        nombre: body.nombre?.trim() || null,
        tipoContactoId: body.tipoContactoId
          ? parseInt(body.tipoContactoId, 10)
          : null,
        telefono: body.telefono?.trim() || null,
        celular: body.celular?.trim() || null,
        email: body.email?.trim() || null,
        historial: body.historial?.trim() || null,
        precioVehicular: body.precioVehicular
          ? parseFloat(body.precioVehicular)
          : null,
        precioPeatonal: body.precioPeatonal
          ? parseFloat(body.precioPeatonal)
          : null,
        mensualidad: body.mensualidad ? parseFloat(body.mensualidad) : null,
        venceContrato: body.venceContrato
          ? new Date(body.venceContrato)
          : null,
        observaciones: body.observaciones?.trim() || null,
        estatusId: 1,
      },
    });

    return NextResponse.json(privada, { status: 201 });
  } catch (error) {
    console.error("Error al crear privada:", error);
    return NextResponse.json(
      { error: "Error al crear privada" },
      { status: 500 }
    );
  }
}
