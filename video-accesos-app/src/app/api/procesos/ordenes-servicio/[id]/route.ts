import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/procesos/ordenes-servicio/[id] - Obtener orden con seguimientos y materiales
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
    const ordenId = parseInt(id, 10);

    if (isNaN(ordenId)) {
      return NextResponse.json({ error: "ID invalido" }, { status: 400 });
    }

    const orden = await prisma.ordenServicio.findUnique({
      where: { id: ordenId },
      include: {
        privada: {
          select: { id: true, descripcion: true },
        },
        tecnico: {
          select: {
            id: true,
            nombre: true,
            apePaterno: true,
            apeMaterno: true,
          },
        },
        empleado: {
          select: {
            id: true,
            nombre: true,
            apePaterno: true,
            apeMaterno: true,
          },
        },
        cierreTecnico: {
          select: {
            id: true,
            nombre: true,
            apePaterno: true,
            apeMaterno: true,
          },
        },
        codigoServicio: {
          select: { id: true, codigo: true, descripcion: true },
        },
        diagnostico: {
          select: { id: true, codigo: true, descripcion: true },
        },
        seguimientos: {
          orderBy: { creadoEn: "asc" },
        },
        materiales: {
          include: {
            material: {
              select: {
                id: true,
                codigo: true,
                descripcion: true,
                costo: true,
              },
            },
          },
        },
      },
    });

    if (!orden) {
      return NextResponse.json(
        { error: "Orden de servicio no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json(orden);
  } catch (error) {
    console.error("Error al obtener orden de servicio:", error);
    return NextResponse.json(
      { error: "Error al obtener orden de servicio" },
      { status: 500 }
    );
  }
}

// PUT /api/procesos/ordenes-servicio/[id] - Actualizar orden de servicio
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
    const ordenId = parseInt(id, 10);

    if (isNaN(ordenId)) {
      return NextResponse.json({ error: "ID invalido" }, { status: 400 });
    }

    const existente = await prisma.ordenServicio.findUnique({
      where: { id: ordenId },
    });

    if (!existente) {
      return NextResponse.json(
        { error: "Orden de servicio no encontrada" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const data: Record<string, unknown> = {};

    // Campos actualizables
    if (body.tecnicoId !== undefined) {
      data.tecnicoId = parseInt(body.tecnicoId, 10);
    }
    if (body.codigoServicioId !== undefined) {
      data.codigoServicioId = parseInt(body.codigoServicioId, 10);
    }
    if (body.detalleServicio !== undefined) {
      data.detalleServicio = body.detalleServicio.trim();
    }
    if (body.diagnosticoId !== undefined) {
      data.diagnosticoId = body.diagnosticoId
        ? parseInt(body.diagnosticoId, 10)
        : null;
    }
    if (body.detalleDiagnostico !== undefined) {
      data.detalleDiagnostico = body.detalleDiagnostico?.trim() || null;
    }
    if (body.fechaAsistio !== undefined) {
      data.fechaAsistio = body.fechaAsistio
        ? new Date(body.fechaAsistio)
        : null;
    }
    if (body.tiempo !== undefined) {
      data.tiempo = body.tiempo ? parseInt(body.tiempo, 10) : null;
    }
    if (body.estatusId !== undefined) {
      data.estatusId = parseInt(body.estatusId, 10);
    }

    // Manejo de cierre de orden
    if (body.cierreTecnicoId !== undefined) {
      data.cierreTecnicoId = body.cierreTecnicoId
        ? parseInt(body.cierreTecnicoId, 10)
        : null;
    }
    if (body.cierreFecha !== undefined) {
      data.cierreFecha = body.cierreFecha
        ? new Date(body.cierreFecha)
        : null;
    }
    if (body.cierreComentario !== undefined) {
      data.cierreComentario = body.cierreComentario?.trim() || null;
    }

    // Si se esta cerrando la orden (estatusId = 3), asegurar campos de cierre
    if (parseInt(body.estatusId, 10) === 3) {
      if (!data.cierreTecnicoId) {
        data.cierreTecnicoId = body.cierreTecnicoId
          ? parseInt(body.cierreTecnicoId, 10)
          : existente.tecnicoId;
      }
      if (!data.cierreFecha) {
        data.cierreFecha = new Date();
      }
    }

    const orden = await prisma.ordenServicio.update({
      where: { id: ordenId },
      data,
      include: {
        privada: {
          select: { id: true, descripcion: true },
        },
        tecnico: {
          select: {
            id: true,
            nombre: true,
            apePaterno: true,
            apeMaterno: true,
          },
        },
        empleado: {
          select: {
            id: true,
            nombre: true,
            apePaterno: true,
            apeMaterno: true,
          },
        },
        cierreTecnico: {
          select: {
            id: true,
            nombre: true,
            apePaterno: true,
            apeMaterno: true,
          },
        },
        codigoServicio: {
          select: { id: true, codigo: true, descripcion: true },
        },
        diagnostico: {
          select: { id: true, codigo: true, descripcion: true },
        },
        seguimientos: {
          orderBy: { creadoEn: "asc" },
        },
        materiales: {
          include: {
            material: {
              select: {
                id: true,
                codigo: true,
                descripcion: true,
                costo: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(orden);
  } catch (error) {
    console.error("Error al actualizar orden de servicio:", error);
    return NextResponse.json(
      { error: "Error al actualizar orden de servicio" },
      { status: 500 }
    );
  }
}
