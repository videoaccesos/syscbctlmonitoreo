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
    // Aceptar tanto "pageSize" como "limit" para compatibilidad
    const pageSize = parseInt(
      searchParams.get("pageSize") || searchParams.get("limit") || "10",
      10
    );
    const skip = (page - 1) * pageSize;

    // estatusId: si se pasa, filtrar por ese estatus exacto (dropdowns: estatusId=1).
    // Si no se pasa, mostrar todos excepto eliminados (4),
    // replicando el comportamiento del sistema legacy (estatus_id <> 4).
    const estatusParam = searchParams.get("estatusId");
    const estatusFilter = estatusParam
      ? { estatusId: parseInt(estatusParam, 10) }
      : { estatusId: { not: 4 } };

    const where = {
      ...estatusFilter,
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
        puerto1: body.puerto1?.trim() || "",
        alias1: body.alias1?.trim() || "",
        tipoTarjeta1: body.tipoTarjeta1?.trim() || "",
        contrasena1: body.contrasena1?.trim() || "",
        dns2: body.dns2?.trim() || "",
        puerto2: body.puerto2?.trim() || "",
        alias2: body.alias2?.trim() || "",
        tipoTarjeta2: body.tipoTarjeta2?.trim() || "",
        contrasena2: body.contrasena2?.trim() || "",
        dns3: body.dns3?.trim() || "",
        puerto3: body.puerto3?.trim() || "",
        alias3: body.alias3?.trim() || "",
        tipoTarjeta3: body.tipoTarjeta3?.trim() || "",
        contrasena3: body.contrasena3?.trim() || "",
        video1: body.video1?.trim() || "",
        aliasVideo1: body.aliasVideo1?.trim() || "",
        video2: body.video2?.trim() || "",
        aliasVideo2: body.aliasVideo2?.trim() || "",
        video3: body.video3?.trim() || "",
        aliasVideo3: body.aliasVideo3?.trim() || "",
        precioVehicular: parseInt(body.precioVehicular, 10) || 0,
        precioPeatonal: parseInt(body.precioPeatonal, 10) || 0,
        precioMensualidad: parseInt(body.precioMensualidad, 10) || 0,
        venceContrato: body.venceContrato || null,
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
