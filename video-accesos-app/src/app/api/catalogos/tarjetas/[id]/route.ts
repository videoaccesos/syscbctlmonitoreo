import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Helper: construir placeholders para IN clause
function placeholders(count: number): string {
  return Array(count).fill("?").join(",");
}

// GET /api/catalogos/tarjetas/[id] - Obtener una tarjeta por ID
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
    const tarjetaId = parseInt(id, 10);

    if (isNaN(tarjetaId)) {
      return NextResponse.json({ error: "ID invalido" }, { status: 400 });
    }

    const tarjeta = await prisma.tarjeta.findUnique({
      where: { id: tarjetaId },
    });

    if (!tarjeta) {
      return NextResponse.json(
        { error: "Tarjeta no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json(tarjeta);
  } catch (error) {
    console.error("Error al obtener tarjeta:", error);
    return NextResponse.json(
      { error: "Error al obtener tarjeta" },
      { status: 500 }
    );
  }
}

// Cancelar asignaciones activas de una tarjeta en ambas tablas
async function cancelarAsignacionesDeTarjeta(tarjetaId: number): Promise<number> {
  const tid = String(tarjetaId);
  const slots = ["tarjeta_id", "tarjeta_id2", "tarjeta_id3", "tarjeta_id4", "tarjeta_id5"];
  let totalCanceladas = 0;

  for (const table of [
    "residencias_residentes_tarjetas",
    "residencias_residentes_tarjetas_no_renovacion",
  ]) {
    // Buscar asignaciones activas que contengan esta tarjeta en cualquier slot
    const conditions = slots.map((s) => `${s} = ?`).join(" OR ");
    const rows = await prisma.$queryRawUnsafe<Array<{ asignacion_id: number }>>(
      `SELECT asignacion_id FROM \`${table}\` WHERE estatus_id = 1 AND (${conditions})`,
      tid, tid, tid, tid, tid
    );

    if (rows.length > 0) {
      const ids = rows.map((r) => r.asignacion_id);
      const ph = placeholders(ids.length);

      // Cancelar asignaciones (estatus_id = 2)
      await prisma.$executeRawUnsafe(
        `UPDATE \`${table}\` SET estatus_id = 2, fecha_modificacion = ? WHERE asignacion_id IN (${ph})`,
        new Date().toISOString().split("T")[0],
        ...ids
      );

      // Liberar las OTRAS tarjetas de esas asignaciones (no la tarjeta actual)
      for (const row of rows) {
        const asigRows = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
          `SELECT tarjeta_id, tarjeta_id2, tarjeta_id3, tarjeta_id4, tarjeta_id5 FROM \`${table}\` WHERE asignacion_id = ?`,
          row.asignacion_id
        );
        if (asigRows.length > 0) {
          const otrasTarjetaIds = slots
            .map((s) => String(asigRows[0][s] || ""))
            .filter((t) => t !== "" && parseInt(t, 10) !== tarjetaId)
            .map((t) => parseInt(t, 10))
            .filter((t) => !isNaN(t));

          if (otrasTarjetaIds.length > 0) {
            await prisma.tarjeta.updateMany({
              where: { id: { in: otrasTarjetaIds } },
              data: { estatusId: 1 },
            });
          }
        }
      }

      totalCanceladas += rows.length;
    }
  }

  return totalCanceladas;
}

// PUT /api/catalogos/tarjetas/[id] - Actualizar una tarjeta
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
    const tarjetaId = parseInt(id, 10);

    if (isNaN(tarjetaId)) {
      return NextResponse.json({ error: "ID invalido" }, { status: 400 });
    }

    const body = await request.json();

    // Validacion basica
    if (!body.lectura || body.lectura.trim() === "") {
      return NextResponse.json(
        { error: "La lectura es requerida" },
        { status: 400 }
      );
    }

    if (!body.tipoId) {
      return NextResponse.json(
        { error: "El tipo es requerido (1=Peatonal, 2=Vehicular)" },
        { status: 400 }
      );
    }

    const tipoId = parseInt(body.tipoId, 10);
    if (![1, 2].includes(tipoId)) {
      return NextResponse.json(
        { error: "El tipo debe ser 1 (Peatonal) o 2 (Vehicular)" },
        { status: 400 }
      );
    }

    // Verificar que existe
    const existente = await prisma.tarjeta.findUnique({
      where: { id: tarjetaId },
    });

    if (!existente) {
      return NextResponse.json(
        { error: "Tarjeta no encontrada" },
        { status: 404 }
      );
    }

    // --- Logica de cambio de estado ---
    const nuevoEstatus = body.estatusId !== undefined
      ? parseInt(body.estatusId, 10)
      : existente.estatusId;

    if (![1, 2, 3, 4, 5].includes(nuevoEstatus)) {
      return NextResponse.json(
        { error: "El estatus debe ser 1 (Activa), 2 (Asignada), 3 (Danada), 4 (Consignacion) o 5 (Baja)" },
        { status: 400 }
      );
    }

    // No se puede poner manualmente en "Asignada" (2) - eso solo pasa por el proceso de asignacion
    if (nuevoEstatus === 2 && existente.estatusId !== 2) {
      return NextResponse.json(
        { error: "No se puede asignar manualmente. Use el proceso de asignacion de tarjetas." },
        { status: 400 }
      );
    }

    // No se puede cambiar de Asignada a Activa directamente - debe cancelar la asignacion primero
    if (existente.estatusId === 2 && nuevoEstatus === 1) {
      return NextResponse.json(
        { error: "No se puede cambiar a Activa una tarjeta asignada. Cancele la asignacion desde el proceso de asignacion, o cambie a Danada/Consignacion/Baja." },
        { status: 400 }
      );
    }

    // Si cambia de Asignada (2) a Danada/Consignacion/Baja (3/4/5) -> requiere observaciones
    const cambiaEstado = nuevoEstatus !== existente.estatusId;
    const requiereObservaciones = cambiaEstado && [3, 4, 5].includes(nuevoEstatus);

    if (requiereObservaciones) {
      const obs = (body.observaciones || "").trim();
      if (!obs) {
        return NextResponse.json(
          { error: "Debe indicar el motivo en observaciones al cambiar el estado a " +
            ({ 3: "Danada", 4: "Consignacion", 5: "Baja" }[nuevoEstatus] || "este estado") },
          { status: 400 }
        );
      }
    }

    // Si la tarjeta esta asignada y se cambia a 3/4/5 -> cancelar asignaciones automaticamente
    let asignacionesCanceladas = 0;
    if (existente.estatusId === 2 && [3, 4, 5].includes(nuevoEstatus)) {
      asignacionesCanceladas = await cancelarAsignacionesDeTarjeta(tarjetaId);
    }

    // Verificar duplicado de lectura (excluyendo el registro actual)
    const duplicado = await prisma.tarjeta.findFirst({
      where: {
        lectura: body.lectura.trim(),
        NOT: { id: tarjetaId },
      },
    });

    if (duplicado) {
      return NextResponse.json(
        { error: "Ya existe otra tarjeta con esa lectura" },
        { status: 409 }
      );
    }

    const tarjeta = await prisma.tarjeta.update({
      where: { id: tarjetaId },
      data: {
        lectura: body.lectura.trim(),
        numeroSerie: body.numeroSerie?.trim() || "",
        tipoId,
        estatusId: nuevoEstatus,
        observaciones: body.observaciones?.trim() || existente.observaciones,
        ...(body.fecha !== undefined && {
          fecha: new Date(body.fecha),
        }),
      },
    });

    return NextResponse.json({
      ...tarjeta,
      asignacionesCanceladas,
    });
  } catch (error) {
    console.error("Error al actualizar tarjeta:", error);
    return NextResponse.json(
      { error: "Error al actualizar tarjeta" },
      { status: 500 }
    );
  }
}

// DELETE /api/catalogos/tarjetas/[id] - Dar de baja tarjeta
// Requiere observaciones en el body. Cancela asignaciones activas automaticamente.
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
    const tarjetaId = parseInt(id, 10);

    if (isNaN(tarjetaId)) {
      return NextResponse.json({ error: "ID invalido" }, { status: 400 });
    }

    // Verificar que existe
    const existente = await prisma.tarjeta.findUnique({
      where: { id: tarjetaId },
    });

    if (!existente) {
      return NextResponse.json(
        { error: "Tarjeta no encontrada" },
        { status: 404 }
      );
    }

    // Leer body para observaciones (puede venir vacio en DELETE)
    let observaciones = "";
    try {
      const body = await request.json();
      observaciones = (body.observaciones || "").trim();
    } catch {
      // No body en DELETE es normal
    }

    if (!observaciones) {
      return NextResponse.json(
        { error: "Debe indicar el motivo en observaciones para dar de baja la tarjeta" },
        { status: 400 }
      );
    }

    // Si esta asignada, cancelar asignaciones
    let asignacionesCanceladas = 0;
    if (existente.estatusId === 2) {
      asignacionesCanceladas = await cancelarAsignacionesDeTarjeta(tarjetaId);
    }

    // Cambiar estatus a 5 (Baja)
    await prisma.tarjeta.update({
      where: { id: tarjetaId },
      data: {
        estatusId: 5,
        observaciones,
      },
    });

    return NextResponse.json({
      message: "Tarjeta dada de baja correctamente",
      asignacionesCanceladas,
    });
  } catch (error) {
    console.error("Error al dar de baja tarjeta:", error);
    return NextResponse.json(
      { error: "Error al dar de baja tarjeta" },
      { status: 500 }
    );
  }
}
