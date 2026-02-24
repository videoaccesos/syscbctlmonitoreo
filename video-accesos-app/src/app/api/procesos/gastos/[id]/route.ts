import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/procesos/gastos/[id] - Obtener un gasto por ID
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
    const gastoId = parseInt(id, 10);

    if (isNaN(gastoId)) {
      return NextResponse.json({ error: "ID invalido" }, { status: 400 });
    }

    const gasto = await prisma.gasto.findUnique({
      where: { id: gastoId },
      include: {
        tipoGasto: {
          select: { id: true, descripcion: true },
        },
        privada: {
          select: { id: true, descripcion: true },
        },
      },
    });

    if (!gasto) {
      return NextResponse.json(
        { error: "Gasto no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(gasto);
  } catch (error) {
    console.error("Error al obtener gasto:", error);
    return NextResponse.json(
      { error: "Error al obtener gasto" },
      { status: 500 }
    );
  }
}

// PUT /api/procesos/gastos/[id] - Actualizar gasto
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
    const gastoId = parseInt(id, 10);

    if (isNaN(gastoId)) {
      return NextResponse.json({ error: "ID invalido" }, { status: 400 });
    }

    const existente = await prisma.gasto.findUnique({
      where: { id: gastoId },
    });

    if (!existente) {
      return NextResponse.json(
        { error: "Gasto no encontrado" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const data: Record<string, unknown> = {};

    if (body.tipoGastoId !== undefined) {
      data.tipoGastoId = parseInt(body.tipoGastoId, 10);
    }
    if (body.privadaId !== undefined) {
      data.privadaId = parseInt(body.privadaId, 10);
    }
    if (body.descripcion !== undefined) {
      data.descripcion = body.descripcion.trim();
    }
    if (body.fechaPago !== undefined) {
      data.fechaPago = new Date(body.fechaPago);
    }
    if (body.comprobante !== undefined) {
      data.comprobante = body.comprobante?.trim() || null;
    }
    if (body.total !== undefined) {
      data.total = parseFloat(body.total);
    }
    if (body.tipoPagoId !== undefined) {
      data.tipoPagoId = parseInt(body.tipoPagoId, 10);
    }
    if (body.autorizado !== undefined) {
      data.autorizado = Boolean(body.autorizado);
    }
    if (body.autorizadoPor !== undefined) {
      data.autorizadoPor = body.autorizadoPor
        ? parseInt(body.autorizadoPor, 10)
        : null;
    }
    if (body.pagado !== undefined) {
      data.pagado = Boolean(body.pagado);
    }

    const gasto = await prisma.gasto.update({
      where: { id: gastoId },
      data,
      include: {
        tipoGasto: {
          select: { id: true, descripcion: true },
        },
        privada: {
          select: { id: true, descripcion: true },
        },
      },
    });

    return NextResponse.json(gasto);
  } catch (error) {
    console.error("Error al actualizar gasto:", error);
    return NextResponse.json(
      { error: "Error al actualizar gasto" },
      { status: 500 }
    );
  }
}

// DELETE /api/procesos/gastos/[id] - Eliminar gasto (soft delete)
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
    const gastoId = parseInt(id, 10);

    if (isNaN(gastoId)) {
      return NextResponse.json({ error: "ID invalido" }, { status: 400 });
    }

    const existente = await prisma.gasto.findUnique({
      where: { id: gastoId },
    });

    if (!existente) {
      return NextResponse.json(
        { error: "Gasto no encontrado" },
        { status: 404 }
      );
    }

    if (existente.estatusId === 2) {
      return NextResponse.json(
        { error: "El gasto ya esta dado de baja" },
        { status: 400 }
      );
    }

    // Soft delete: cambiar estatusId a 2 (Baja)
    await prisma.gasto.update({
      where: { id: gastoId },
      data: { estatusId: 2 },
    });

    return NextResponse.json({
      message: "Gasto eliminado correctamente",
    });
  } catch (error) {
    console.error("Error al eliminar gasto:", error);
    return NextResponse.json(
      { error: "Error al eliminar gasto" },
      { status: 500 }
    );
  }
}
