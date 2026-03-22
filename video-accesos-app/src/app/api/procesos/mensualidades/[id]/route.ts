import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureMensualidadesSchema } from "@/lib/ensure-mensualidades";

// DELETE /api/procesos/mensualidades/[id] — Cancela un pago de mensualidad
// Solo permite cancelar el ÚLTIMO pago de esa privada (para mantener secuencia)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    await ensureMensualidadesSchema();

    const { id } = await params;
    const folioId = Number(id);
    if (isNaN(folioId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    // Obtener el registro a cancelar
    const registro = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT folio_mensualidad_id, privada_id, periodo, estatus_id
       FROM folios_mensualidades WHERE folio_mensualidad_id = ?`,
      folioId
    );

    if (registro.length === 0) {
      return NextResponse.json({ error: "Registro no encontrado" }, { status: 404 });
    }

    const row = registro[0];
    if (Number(row.estatus_id) === 2) {
      return NextResponse.json({ error: "Este pago ya fue cancelado" }, { status: 400 });
    }

    // Verificar que sea el último periodo pagado de esa privada
    // (no se puede cancelar un pago intermedio sin romper la secuencia)
    const ultimo = await prisma.$queryRawUnsafe<Array<{ periodo: string }>>(
      `SELECT periodo FROM folios_mensualidades
       WHERE privada_id = ? AND estatus_id = 1
       ORDER BY periodo DESC LIMIT 1`,
      Number(row.privada_id)
    );

    if (ultimo.length > 0 && ultimo[0].periodo !== String(row.periodo)) {
      return NextResponse.json(
        { error: `Solo se puede cancelar el último pago registrado (${ultimo[0].periodo}). Este pago es del periodo ${row.periodo}.` },
        { status: 400 }
      );
    }

    // Cancelar
    const userId = Number((session.user as Record<string, unknown>)?.id || 0);
    await prisma.$executeRawUnsafe(
      `UPDATE folios_mensualidades
       SET estatus_id = 2, fecha_modificacion = NOW(), usuario_mod_id = ?
       WHERE folio_mensualidad_id = ?`,
      userId, folioId
    );

    return NextResponse.json({
      message: `Pago del periodo ${row.periodo} cancelado exitosamente`,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Error al cancelar mensualidad:", msg);
    return NextResponse.json({ error: `Error: ${msg}` }, { status: 500 });
  }
}
