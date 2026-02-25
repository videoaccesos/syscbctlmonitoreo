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
        apePaterno: body.apePaterno?.trim() || "",
        apeMaterno: body.apeMaterno?.trim() || "",
        nombre: body.nombre?.trim() || "",
        tipoContactoId: body.tipoContactoId
          ? parseInt(body.tipoContactoId, 10)
          : 0,
        telefono: body.telefono?.trim() || "",
        celular: body.celular?.trim() || "",
        email: body.email?.trim() || "",
        historial: body.historial?.trim() || "",
        dns1: body.dns1?.trim() || "",
        dns2: body.dns2?.trim() || "",
        dns3: body.dns3?.trim() || "",
        video1: body.video1?.trim() || "",
        video2: body.video2?.trim() || "",
        video3: body.video3?.trim() || "",
        relay1: body.relay1?.trim() || "",
        relay2: body.relay2?.trim() || "",
        relay3: body.relay3?.trim() || "",
        monitoreo: parseInt(body.monitoreo, 10) || 0,
        precioVehicular: parseInt(body.precioVehicular, 10) || 0,
        precioPeatonal: parseInt(body.precioPeatonal, 10) || 0,
        precioMensualidad: parseInt(body.precioMensualidad, 10) || 0,
        pagoMensualidad: parseInt(body.pagoMensualidad, 10) || 0,
        renovacion: body.renovacion
          ? new Date(body.renovacion)
          : new Date(),
        venceContrato: body.venceContrato
          ? new Date(body.venceContrato)
          : new Date(),
        observaciones: body.observaciones?.trim() || "",
        estatusId: 1,
        usuarioModId: 0,
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
