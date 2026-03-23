import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureGastosSchema } from "@/lib/ensure-gastos-schema";

// GET /api/procesos/gastos/[id] - Obtener un gasto por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureGastosSchema();

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
        tipoGasto: { select: { id: true, gasto: true } },
        privada: { select: { id: true, descripcion: true } },
        cuentaGasto: { select: { id: true, clave: true, descripcion: true } },
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
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("Error al obtener gasto:", errMsg, error);
    return NextResponse.json(
      { error: "Error al obtener gasto: " + errMsg },
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
    await ensureGastosSchema();

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
    if (body.descripcionGasto !== undefined) {
      data.descripcionGasto = body.descripcionGasto.trim();
    }
    if (body.fechaPago !== undefined) {
      data.fechaPago = String(body.fechaPago) || "";
    }
    if (body.comprobante !== undefined) {
      data.comprobante = body.comprobante?.trim() || "";
    }
    if (body.total !== undefined) {
      data.total = parseFloat(body.total);
    }
    if (body.tipoPago !== undefined) {
      data.tipoPago = parseInt(body.tipoPago, 10);
    }
    if (body.fecha !== undefined) {
      data.fecha = String(body.fecha) || "";
    }
    if (body.estatusId !== undefined) {
      data.estatusId = parseInt(body.estatusId, 10);
    }
    if (body.cuentaGastoId !== undefined) {
      data.cuentaGastoId = parseInt(body.cuentaGastoId, 10);
    }
    if (body.tipoDestino !== undefined) {
      const td = parseInt(body.tipoDestino, 10);
      data.tipoDestino = td;
      if (td > 0) {
        data.privadaId = 0;
      }
    }

    // Si privadaId=0 (corporativo), usar raw update para evitar FK
    if (data.privadaId === 0) {
      const sets: string[] = [];
      const vals: unknown[] = [];
      for (const [k, v] of Object.entries(data)) {
        const colMap: Record<string, string> = {
          tipoGastoId: "tipo_gasto", privadaId: "privada_id",
          descripcionGasto: "descripcion_gasto", fechaPago: "fecha_pago",
          tipoPago: "tipo_pago", estatusId: "estatus_id",
          cuentaGastoId: "cuenta_gasto_id", tipoDestino: "tipo_destino",
          comprobante: "comprobante", total: "total", fecha: "fecha",
        };
        const col = colMap[k] || k;
        sets.push(`${col} = ?`);
        vals.push(v);
      }
      await prisma.$executeRawUnsafe(`SET FOREIGN_KEY_CHECKS=0`);
      try {
        await prisma.$executeRawUnsafe(
          `UPDATE gastos SET ${sets.join(", ")} WHERE gasto_id = ?`,
          ...vals, gastoId
        );
      } finally {
        await prisma.$executeRawUnsafe(`SET FOREIGN_KEY_CHECKS=1`);
      }
      return NextResponse.json({ message: "Gasto actualizado" });
    }

    const gasto = await prisma.gasto.update({
      where: { id: gastoId },
      data,
      include: {
        tipoGasto: { select: { id: true, gasto: true } },
        privada: { select: { id: true, descripcion: true } },
        cuentaGasto: { select: { id: true, clave: true, descripcion: true } },
      },
    });

    return NextResponse.json(gasto);
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("Error al actualizar gasto:", errMsg, error);
    return NextResponse.json(
      { error: "Error al actualizar gasto: " + errMsg },
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
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("Error al eliminar gasto:", errMsg, error);
    return NextResponse.json(
      { error: "Error al eliminar gasto: " + errMsg },
      { status: 500 }
    );
  }
}
