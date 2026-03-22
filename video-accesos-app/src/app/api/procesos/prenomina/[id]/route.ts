import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PUT /api/procesos/prenomina/[id] — Actualizar un registro de prenomina
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
    const prenominaId = Number(id);
    if (isNaN(prenominaId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const body = await request.json();
    const userId = Number((session.user as Record<string, unknown>)?.id || 0);

    // Verificar que existe y no está pagada/cancelada
    const registro = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT prenomina_id, estatus_id FROM prenomina WHERE prenomina_id = ?`,
      prenominaId
    );

    if (registro.length === 0) {
      return NextResponse.json({ error: "Registro no encontrado" }, { status: 404 });
    }

    const estatus = Number(registro[0].estatus_id);
    if (estatus === 3) {
      return NextResponse.json({ error: "No se puede modificar una prenomina ya pagada" }, { status: 400 });
    }
    if (estatus === 4) {
      return NextResponse.json({ error: "No se puede modificar una prenomina cancelada" }, { status: 400 });
    }

    // Campos actualizables
    const diasTrabajados = body.diasTrabajados !== undefined ? Number(body.diasTrabajados) : undefined;
    const deducciones = body.deducciones !== undefined ? Number(body.deducciones) : undefined;
    const percepciones = body.percepciones !== undefined ? Number(body.percepciones) : undefined;
    const observaciones = body.observaciones !== undefined ? body.observaciones : undefined;

    // Recalcular total si cambiaron días, deducciones o percepciones
    const current = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT sueldo_base, dias_trabajados, deducciones, percepciones FROM prenomina WHERE prenomina_id = ?`,
      prenominaId
    );
    const c = current[0];
    const dias = diasTrabajados ?? Number(c.dias_trabajados);
    const ded = deducciones ?? Number(c.deducciones);
    const perc = percepciones ?? Number(c.percepciones);
    const sueldoBase = Number(c.sueldo_base);
    const proporcional = (sueldoBase / 2) * (dias / 15);
    const totalPagar = proporcional + perc - ded;

    const sets: string[] = [];
    const values: unknown[] = [];

    if (diasTrabajados !== undefined) { sets.push("dias_trabajados = ?"); values.push(dias); }
    if (deducciones !== undefined) { sets.push("deducciones = ?"); values.push(ded); }
    if (percepciones !== undefined) { sets.push("percepciones = ?"); values.push(perc); }
    if (observaciones !== undefined) { sets.push("observaciones = ?"); values.push(observaciones); }
    sets.push("total_pagar = ?"); values.push(totalPagar);
    sets.push("fecha_modificacion = NOW()");
    sets.push("usuario_mod_id = ?"); values.push(userId);

    await prisma.$executeRawUnsafe(
      `UPDATE prenomina SET ${sets.join(", ")} WHERE prenomina_id = ?`,
      ...values, prenominaId
    );

    return NextResponse.json({ message: "Registro actualizado", totalPagar });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Error al actualizar prenomina:", msg);
    return NextResponse.json({ error: `Error: ${msg}` }, { status: 500 });
  }
}

// PATCH /api/procesos/prenomina/[id] — Cambiar estatus
// Body: { estatusId: 2|3|4 } (2=Aprobada, 3=Pagada, 4=Cancelada)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const prenominaId = Number(id);
    if (isNaN(prenominaId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const body = await request.json();
    const nuevoEstatus = Number(body.estatusId);

    if (![2, 3, 4].includes(nuevoEstatus)) {
      return NextResponse.json(
        { error: "estatusId debe ser 2 (Aprobada), 3 (Pagada) o 4 (Cancelada)" },
        { status: 400 }
      );
    }

    const userId = Number((session.user as Record<string, unknown>)?.id || 0);

    await prisma.$executeRawUnsafe(
      `UPDATE prenomina SET estatus_id = ?, fecha_modificacion = NOW(), usuario_mod_id = ?
       WHERE prenomina_id = ?`,
      nuevoEstatus, userId, prenominaId
    );

    const labels: Record<number, string> = { 2: "Aprobada", 3: "Pagada", 4: "Cancelada" };
    return NextResponse.json({ message: `Prenomina marcada como ${labels[nuevoEstatus]}` });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Error al cambiar estatus prenomina:", msg);
    return NextResponse.json({ error: `Error: ${msg}` }, { status: 500 });
  }
}
