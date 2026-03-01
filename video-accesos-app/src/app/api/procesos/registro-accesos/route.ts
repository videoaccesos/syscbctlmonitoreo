import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/procesos/registro-accesos - Listar registros de acceso con filtros y paginacion
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const privadaId = searchParams.get("privadaId");
    const fechaDesde = searchParams.get("fechaDesde");
    const fechaHasta = searchParams.get("fechaHasta");
    const tipoGestionId = searchParams.get("tipoGestionId");
    const estatusId = searchParams.get("estatusId");
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const skip = (page - 1) * limit;

    // Construir filtros dinamicamente
    const where: Record<string, unknown> = {};

    if (privadaId) {
      where.privadaId = parseInt(privadaId, 10);
    }

    if (tipoGestionId) {
      where.tipoGestionId = parseInt(tipoGestionId, 10);
    }

    if (estatusId) {
      where.estatusId = parseInt(estatusId, 10);
    }

    // Filtro de fechas: por defecto muestra los registros de hoy
    if (fechaDesde || fechaHasta) {
      const fechaModificacionFilter: Record<string, Date> = {};
      if (fechaDesde) {
        fechaModificacionFilter.gte = new Date(`${fechaDesde}T00:00:00`);
      }
      if (fechaHasta) {
        fechaModificacionFilter.lte = new Date(`${fechaHasta}T23:59:59`);
      }
      where.fechaModificacion = fechaModificacionFilter;
    } else {
      // Por defecto: registros de hoy
      const hoy = new Date();
      const inicioHoy = new Date(
        hoy.getFullYear(),
        hoy.getMonth(),
        hoy.getDate(),
        0,
        0,
        0
      );
      const finHoy = new Date(
        hoy.getFullYear(),
        hoy.getMonth(),
        hoy.getDate(),
        23,
        59,
        59
      );
      where.fechaModificacion = {
        gte: inicioHoy,
        lte: finHoy,
      };
    }

    // Busqueda por texto (solicitante, observaciones)
    if (search) {
      where.OR = [
        { observaciones: { contains: search } },
        { solicitanteId: { contains: search } },
      ];
    }

    const [registros, total] = await Promise.all([
      prisma.registroAcceso.findMany({
        where,
        include: {
          privada: {
            select: { id: true, descripcion: true },
          },
          residencia: {
            select: { id: true, nroCasa: true, calle: true },
          },
          empleado: {
            select: {
              id: true,
              nombre: true,
              apePaterno: true,
              apeMaterno: true,
              nroOperador: true,
            },
          },
        },
        orderBy: { fechaModificacion: "desc" },
        skip,
        take: limit,
      }),
      prisma.registroAcceso.count({ where }),
    ]);

    return NextResponse.json({
      data: registros,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error al listar registros de acceso:", error);
    return NextResponse.json(
      { error: "Error al obtener registros de acceso" },
      { status: 500 }
    );
  }
}

// POST /api/procesos/registro-accesos - Crear nuevo registro de acceso
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();

    // Validacion de campos requeridos
    const {
      empleadoId,
      privadaId,
      residenciaId,
      tipoGestionId,
      solicitanteId,
      estatusId,
      usuarioId,
      observaciones,
      duracion,
      imagen,
      ocr,
    } = body;

    if (
      !empleadoId ||
      !privadaId ||
      !residenciaId ||
      !tipoGestionId ||
      !solicitanteId ||
      !estatusId ||
      !usuarioId
    ) {
      return NextResponse.json(
        {
          error:
            "Campos requeridos: empleadoId, privadaId, residenciaId, tipoGestionId, solicitanteId, estatusId, usuarioId",
        },
        { status: 400 }
      );
    }

    // Validar que la privada existe
    const privada = await prisma.privada.findFirst({
      where: { id: parseInt(privadaId, 10), estatusId: 1 },
      select: { id: true },
    });

    if (!privada) {
      return NextResponse.json(
        { error: "Privada no encontrada" },
        { status: 404 }
      );
    }

    // Validar que la residencia existe y pertenece a la privada
    const residencia = await prisma.residencia.findFirst({
      where: {
        id: parseInt(residenciaId, 10),
        privadaId: parseInt(privadaId, 10),
      },
    });

    if (!residencia) {
      return NextResponse.json(
        { error: "Residencia no encontrada o no pertenece a la privada indicada" },
        { status: 404 }
      );
    }

    // duracion is DateTime @db.Time(0) - convert string like "00:01:30" to Date
    let duracionValue = new Date("1970-01-01T00:00:00");
    if (duracion) {
      duracionValue = new Date(`1970-01-01T${duracion}`);
    }

    const registro = await prisma.registroAcceso.create({
      data: {
        empleadoId: parseInt(empleadoId, 10),
        privadaId: parseInt(privadaId, 10),
        residenciaId: parseInt(residenciaId, 10),
        tipoGestionId: parseInt(tipoGestionId, 10),
        solicitanteId: String(solicitanteId) || "",
        observaciones: observaciones?.trim() || "",
        ocr: ocr?.trim() || "",
        duracion: duracionValue,
        imagen: imagen || "",
        estatusId: parseInt(estatusId, 10),
        usuarioId: parseInt(usuarioId, 10),
      },
      include: {
        privada: {
          select: { id: true, descripcion: true },
        },
        residencia: {
          select: { id: true, nroCasa: true, calle: true },
        },
        empleado: {
          select: {
            id: true,
            nombre: true,
            apePaterno: true,
            apeMaterno: true,
            nroOperador: true,
          },
        },
      },
    });

    return NextResponse.json(registro, { status: 201 });
  } catch (error) {
    console.error("Error al crear registro de acceso:", error);
    return NextResponse.json(
      { error: "Error al crear registro de acceso" },
      { status: 500 }
    );
  }
}
