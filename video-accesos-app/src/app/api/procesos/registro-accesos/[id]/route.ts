import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/procesos/registro-accesos/[id] - Obtener un registro de acceso por ID con todas sus relaciones
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const registroId = parseInt(id, 10);

    if (isNaN(registroId)) {
      return NextResponse.json({ error: "ID invalido" }, { status: 400 });
    }

    const registro = await prisma.registroAcceso.findUnique({
      where: { id: registroId },
      include: {
        privada: {
          select: { id: true, descripcion: true },
        },
        residencia: {
          select: {
            id: true,
            nroCasa: true,
            calle: true,
            telefono1: true,
            telefono2: true,
            interfon: true,
            telefonoInterfon: true,
            observaciones: true,
            privada: {
              select: { id: true, descripcion: true },
            },
          },
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
        usuario: {
          select: {
            id: true,
            usuario: true,
            empleado: {
              select: {
                nombre: true,
                apePaterno: true,
              },
            },
          },
        },
        supervisionLlamada: true,
      },
    });

    if (!registro) {
      return NextResponse.json(
        { error: "Registro de acceso no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(registro);
  } catch (error) {
    console.error("Error al obtener registro de acceso:", error);
    return NextResponse.json(
      { error: "Error al obtener registro de acceso" },
      { status: 500 }
    );
  }
}

// PUT /api/procesos/registro-accesos/[id] - Actualizar un registro de acceso
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const registroId = parseInt(id, 10);

    if (isNaN(registroId)) {
      return NextResponse.json({ error: "ID invalido" }, { status: 400 });
    }

    // Verificar que el registro existe
    const existente = await prisma.registroAcceso.findUnique({
      where: { id: registroId },
    });

    if (!existente) {
      return NextResponse.json(
        { error: "Registro de acceso no encontrado" },
        { status: 404 }
      );
    }

    const body = await request.json();

    // Construir datos de actualizacion solo con campos proporcionados
    const data: Record<string, unknown> = {};

    if (body.tipoGestionId !== undefined) {
      data.tipoGestionId = parseInt(body.tipoGestionId, 10);
    }
    if (body.solicitanteId !== undefined) {
      data.solicitanteId = String(body.solicitanteId);
    }
    if (body.solicitanteTipo !== undefined) {
      data.solicitanteTipo = body.solicitanteTipo;
    }
    if (body.observaciones !== undefined) {
      data.observaciones = body.observaciones?.trim() || null;
    }
    if (body.quejas !== undefined) {
      data.quejas = body.quejas?.trim() || null;
    }
    if (body.duracion !== undefined) {
      data.duracion = body.duracion || null;
    }
    if (body.imagen !== undefined) {
      data.imagen = body.imagen || null;
    }
    if (body.estatusId !== undefined) {
      data.estatusId = parseInt(body.estatusId, 10);
    }

    const registro = await prisma.registroAcceso.update({
      where: { id: registroId },
      data,
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

    return NextResponse.json(registro);
  } catch (error) {
    console.error("Error al actualizar registro de acceso:", error);
    return NextResponse.json(
      { error: "Error al actualizar registro de acceso" },
      { status: 500 }
    );
  }
}

// DELETE - No permitido: los registros de acceso no deben eliminarse
export async function DELETE() {
  return NextResponse.json(
    {
      error:
        "No permitido: los registros de acceso no pueden ser eliminados por integridad del historial",
    },
    { status: 405 }
  );
}
