import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Endpoint temporal para diagnosticar y arreglar vence_contrato
// ELIMINAR después de usar
export async function GET() {
  try {
    // 1. Ver estructura de la columna
    const describe = await prisma.$queryRawUnsafe(
      `SHOW COLUMNS FROM privadas WHERE Field = 'vence_contrato'`
    );

    // 2. Ver los datos problemáticos con raw SQL (no pasa por el ORM)
    const badDates = await prisma.$queryRawUnsafe(
      `SELECT privada_id, descripcion, vence_contrato,
              CAST(vence_contrato AS CHAR) as vence_raw
       FROM privadas
       WHERE vence_contrato IS NOT NULL
       LIMIT 20`
    );

    // 3. Contar cuántos tienen zero-date
    const zeroCounts = await prisma.$queryRawUnsafe(
      `SELECT
         COUNT(*) as total,
         SUM(CASE WHEN vence_contrato = '0000-00-00' THEN 1 ELSE 0 END) as zero_dates,
         SUM(CASE WHEN vence_contrato IS NULL THEN 1 ELSE 0 END) as nulls
       FROM privadas`
    );

    return NextResponse.json({
      columnInfo: describe,
      sampleData: badDates,
      counts: zeroCounts,
    });
  } catch (error) {
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}

// POST para intentar arreglar los datos
export async function POST() {
  try {
    const result = await prisma.$executeRawUnsafe(
      `UPDATE privadas SET vence_contrato = NULL WHERE vence_contrato = '0000-00-00'`
    );
    return NextResponse.json({ rowsFixed: result });
  } catch (error) {
    return NextResponse.json(
      { error: String(error), message: "No se pudo actualizar" },
      { status: 500 }
    );
  }
}
