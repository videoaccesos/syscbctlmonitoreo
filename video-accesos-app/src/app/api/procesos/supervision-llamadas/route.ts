import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/procesos/supervision-llamadas - Listar supervisiones de llamadas con filtros
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const supervisorId = searchParams.get("supervisorId");
    const fechaDesde = searchParams.get("fechaDesde");
    const fechaHasta = searchParams.get("fechaHasta");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const skip = (page - 1) * limit;

    // Construir filtros
    const where: Record<string, unknown> = {};

    if (supervisorId) {
      where.supervisorId = parseInt(supervisorId, 10);
    }

    if (fechaDesde || fechaHasta) {
      const fechaFilter: Record<string, Date> = {};
      if (fechaDesde) {
        fechaFilter.gte = new Date(`${fechaDesde}T00:00:00`);
      }
      if (fechaHasta) {
        fechaFilter.lte = new Date(`${fechaHasta}T23:59:59`);
      }
      where.fecha = fechaFilter;
    }

    const [supervisiones, total] = await Promise.all([
      prisma.supervisionLlamada.findMany({
        where,
        include: {
          registroAcceso: {
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
          },
        },
        orderBy: { fecha: "desc" },
        skip,
        take: limit,
      }),
      prisma.supervisionLlamada.count({ where }),
    ]);

    return NextResponse.json({
      data: supervisiones,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error al listar supervisiones de llamadas:", error);
    return NextResponse.json(
      { error: "Error al obtener supervisiones de llamadas" },
      { status: 500 }
    );
  }
}

// POST /api/procesos/supervision-llamadas - Crear nueva supervision de llamada
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();

    const {
      registroAccesoId,
      supervisorId,
      saludo,
      identificoEmpresa,
      identificoOperador,
      amable,
      gracias,
      demanda,
      asunto,
      tiempoGestion,
      observaciones,
    } = body;

    // Validacion de campos requeridos
    if (!registroAccesoId || !supervisorId) {
      return NextResponse.json(
        { error: "Campos requeridos: registroAccesoId, supervisorId" },
        { status: 400 }
      );
    }

    // Validar que el registro de acceso existe
    const registroAcceso = await prisma.registroAcceso.findUnique({
      where: { id: parseInt(registroAccesoId, 10) },
    });

    if (!registroAcceso) {
      return NextResponse.json(
        { error: "Registro de acceso no encontrado" },
        { status: 404 }
      );
    }

    // Validar que no exista ya una supervision para este registro
    const supervisionExistente = await prisma.supervisionLlamada.findUnique({
      where: { registroAccesoId: parseInt(registroAccesoId, 10) },
    });

    if (supervisionExistente) {
      return NextResponse.json(
        { error: "Ya existe una supervision para este registro de acceso" },
        { status: 400 }
      );
    }

    const supervision = await prisma.supervisionLlamada.create({
      data: {
        registroAccesoId: parseInt(registroAccesoId, 10),
        supervisorId: parseInt(supervisorId, 10),
        saludo: Boolean(saludo),
        identificoEmpresa: Boolean(identificoEmpresa),
        identificoOperador: Boolean(identificoOperador),
        amable: Boolean(amable),
        gracias: Boolean(gracias),
        demanda: Boolean(demanda),
        asunto: Boolean(asunto),
        tiempoGestion: tiempoGestion?.trim() || null,
        observaciones: observaciones?.trim() || null,
      },
      include: {
        registroAcceso: {
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
        },
      },
    });

    return NextResponse.json(supervision, { status: 201 });
  } catch (error) {
    console.error("Error al crear supervision de llamada:", error);
    return NextResponse.json(
      { error: "Error al crear supervision de llamada" },
      { status: 500 }
    );
  }
}
