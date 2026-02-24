import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/procesos/asignacion-tarjetas/[id] - Obtener una asignacion por ID
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
    const asignacionId = parseInt(id, 10);

    if (isNaN(asignacionId)) {
      return NextResponse.json({ error: "ID invalido" }, { status: 400 });
    }

    const asignacion = await prisma.asignacionTarjeta.findUnique({
      where: { id: asignacionId },
      include: {
        tarjeta: {
          select: {
            id: true,
            lectura: true,
            tipoId: true,
            estatusId: true,
          },
        },
        residente: {
          select: {
            id: true,
            nombre: true,
            apePaterno: true,
            apeMaterno: true,
            celular: true,
            email: true,
            residencia: {
              select: {
                id: true,
                nroCasa: true,
                calle: true,
                privada: {
                  select: {
                    id: true,
                    descripcion: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!asignacion) {
      return NextResponse.json(
        { error: "Asignacion no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json(asignacion);
  } catch (error) {
    console.error("Error al obtener asignacion:", error);
    return NextResponse.json(
      { error: "Error al obtener asignacion" },
      { status: 500 }
    );
  }
}

// PUT /api/procesos/asignacion-tarjetas/[id] - Actualizar asignacion
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
    const asignacionId = parseInt(id, 10);

    if (isNaN(asignacionId)) {
      return NextResponse.json({ error: "ID invalido" }, { status: 400 });
    }

    const existente = await prisma.asignacionTarjeta.findUnique({
      where: { id: asignacionId },
    });

    if (!existente) {
      return NextResponse.json(
        { error: "Asignacion no encontrada" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const data: Record<string, unknown> = {};

    if (body.tarjetaSecId !== undefined) {
      data.tarjetaSecId = body.tarjetaSecId
        ? parseInt(body.tarjetaSecId, 10)
        : null;
    }
    if (body.fechaVencimiento !== undefined) {
      data.fechaVencimiento = body.fechaVencimiento
        ? new Date(body.fechaVencimiento)
        : null;
    }
    if (body.tipoLectura !== undefined) {
      data.tipoLectura = body.tipoLectura
        ? parseInt(body.tipoLectura, 10)
        : null;
    }
    if (body.lecturaEpc !== undefined) {
      data.lecturaEpc = body.lecturaEpc?.trim() || null;
    }
    if (body.folioContrato !== undefined) {
      data.folioContrato = body.folioContrato?.trim() || null;
    }
    if (body.precio !== undefined) {
      data.precio = body.precio ? parseFloat(body.precio) : null;
    }
    if (body.utilizoSeguro !== undefined) {
      data.utilizoSeguro = Boolean(body.utilizoSeguro);
    }

    const asignacion = await prisma.asignacionTarjeta.update({
      where: { id: asignacionId },
      data,
      include: {
        tarjeta: {
          select: {
            id: true,
            lectura: true,
            tipoId: true,
            estatusId: true,
          },
        },
        residente: {
          select: {
            id: true,
            nombre: true,
            apePaterno: true,
            apeMaterno: true,
            residencia: {
              select: {
                id: true,
                nroCasa: true,
                calle: true,
                privada: {
                  select: {
                    id: true,
                    descripcion: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return NextResponse.json(asignacion);
  } catch (error) {
    console.error("Error al actualizar asignacion:", error);
    return NextResponse.json(
      { error: "Error al actualizar asignacion" },
      { status: 500 }
    );
  }
}

// DELETE /api/procesos/asignacion-tarjetas/[id] - Cancelar asignacion (no elimina, cambia estatus)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const asignacionId = parseInt(id, 10);

    if (isNaN(asignacionId)) {
      return NextResponse.json({ error: "ID invalido" }, { status: 400 });
    }

    const existente = await prisma.asignacionTarjeta.findUnique({
      where: { id: asignacionId },
    });

    if (!existente) {
      return NextResponse.json(
        { error: "Asignacion no encontrada" },
        { status: 404 }
      );
    }

    if (existente.estatusId === 2) {
      return NextResponse.json(
        { error: "La asignacion ya esta cancelada" },
        { status: 400 }
      );
    }

    // Cancelar asignacion y restaurar tarjeta en una transaccion
    await prisma.$transaction(async (tx) => {
      // Cambiar estatus de asignacion a 2 (Cancelada)
      await tx.asignacionTarjeta.update({
        where: { id: asignacionId },
        data: { estatusId: 2 },
      });

      // Restaurar tarjeta a estatusId 1 (Activa)
      await tx.tarjeta.update({
        where: { id: existente.tarjetaId },
        data: { estatusId: 1 },
      });
    });

    return NextResponse.json({
      message: "Asignacion cancelada correctamente",
    });
  } catch (error) {
    console.error("Error al cancelar asignacion:", error);
    return NextResponse.json(
      { error: "Error al cancelar asignacion" },
      { status: 500 }
    );
  }
}
