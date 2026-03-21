import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/catalogos/tarjetas/corregir-estatus
// Corrige tarjetas con estatus_id=1 (Activa) que tienen asignacion activa
// y las cambia a estatus_id=2 (Asignada)
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Buscar tarjetas con estatus_id=1 que tienen al menos una asignacion
    // activa (estatus_id=1) en cualquiera de los 5 slots de ambas tablas
    const slots = ["tarjeta_id", "tarjeta_id2", "tarjeta_id3", "tarjeta_id4", "tarjeta_id5"];

    const unions: string[] = [];
    for (const table of [
      "residencias_residentes_tarjetas",
      "residencias_residentes_tarjetas_no_renovacion",
    ]) {
      for (const slot of slots) {
        unions.push(
          `SELECT DISTINCT CAST(a.${slot} AS UNSIGNED) AS tid
           FROM ${table} a
           WHERE a.estatus_id = 1
             AND a.${slot} != ''
             AND a.${slot} != '0'`
        );
      }
    }

    // Obtener todos los IDs de tarjetas con asignacion activa
    const asignadaIds = await prisma.$queryRawUnsafe<Array<{ tid: number }>>(
      `SELECT DISTINCT tid FROM (${unions.join("\nUNION ALL\n")}) sub
       INNER JOIN tarjetas t ON t.tarjeta_id = sub.tid
       WHERE t.estatus_id = 1`
    );

    if (asignadaIds.length === 0) {
      return NextResponse.json({
        message: "No hay tarjetas que corregir",
        actualizadas: 0,
      });
    }

    const ids = asignadaIds.map((r) => Number(r.tid));

    // Actualizar a estatus_id=2 (Asignada)
    const result = await prisma.tarjeta.updateMany({
      where: {
        id: { in: ids },
        estatusId: 1,
      },
      data: {
        estatusId: 2,
        observaciones: "Correccion automatica: tenia asignacion activa",
      },
    });

    return NextResponse.json({
      message: `Se corrigieron ${result.count} tarjeta(s) de Activa a Asignada`,
      actualizadas: result.count,
      ids,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Error al corregir estatus de tarjetas:", msg, error);
    return NextResponse.json(
      { error: `Error al corregir: ${msg}` },
      { status: 500 }
    );
  }
}
