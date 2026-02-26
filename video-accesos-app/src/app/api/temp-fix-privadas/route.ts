import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Endpoint temporal para diagnosticar y arreglar vence_contrato
// ELIMINAR después de usar
export async function GET() {
  try {
    // Desactivar NO_ZERO_DATE para esta sesión
    await prisma.$executeRawUnsafe(
      `SET SESSION sql_mode = REPLACE(@@sql_mode, 'NO_ZERO_DATE', '')`
    );
    await prisma.$executeRawUnsafe(
      `SET SESSION sql_mode = REPLACE(@@sql_mode, 'NO_ZERO_IN_DATE', '')`
    );

    // 1. Ver estructura de la columna
    const describe = await prisma.$queryRawUnsafe(
      `SHOW COLUMNS FROM privadas WHERE Field = 'vence_contrato'`
    );

    // 2. Ver sql_mode actual
    const sqlMode = await prisma.$queryRawUnsafe(`SELECT @@sql_mode as mode`);

    // 3. Ver TODOS los datos de privadas con raw SQL
    const allData = await prisma.$queryRawUnsafe(
      `SELECT privada_id, descripcion,
              CAST(vence_contrato AS CHAR) as vence_contrato_raw
       FROM privadas
       LIMIT 50`
    );

    // 4. Contar zero-dates
    const zeroCounts = await prisma.$queryRawUnsafe(
      `SELECT
         COUNT(*) as total,
         SUM(CASE WHEN CAST(vence_contrato AS CHAR) = '0000-00-00' THEN 1 ELSE 0 END) as zero_dates,
         SUM(CASE WHEN vence_contrato IS NULL THEN 1 ELSE 0 END) as nulls,
         SUM(CASE WHEN vence_contrato IS NOT NULL AND CAST(vence_contrato AS CHAR) != '0000-00-00' THEN 1 ELSE 0 END) as valid_dates
       FROM privadas`
    );

    return NextResponse.json({
      sqlMode,
      columnInfo: describe,
      counts: zeroCounts,
      data: allData,
    });
  } catch (error) {
    return NextResponse.json(
      { error: String(error), stack: (error as Error).stack },
      { status: 500 }
    );
  }
}

// POST para arreglar los datos
export async function POST() {
  try {
    // Desactivar restricciones de zero-date para esta sesión
    await prisma.$executeRawUnsafe(
      `SET SESSION sql_mode = REPLACE(@@sql_mode, 'NO_ZERO_DATE', '')`
    );
    await prisma.$executeRawUnsafe(
      `SET SESSION sql_mode = REPLACE(@@sql_mode, 'NO_ZERO_IN_DATE', '')`
    );

    // Arreglar zero-dates poniéndolas a NULL
    const fixed = await prisma.$executeRawUnsafe(
      `UPDATE privadas SET vence_contrato = NULL WHERE CAST(vence_contrato AS CHAR) = '0000-00-00'`
    );

    // Verificar después del fix
    const afterFix = await prisma.$queryRawUnsafe(
      `SELECT privada_id, descripcion,
              CAST(vence_contrato AS CHAR) as vence_contrato_raw
       FROM privadas`
    );

    return NextResponse.json({ rowsFixed: fixed, dataAfterFix: afterFix });
  } catch (error) {
    return NextResponse.json(
      { error: String(error), stack: (error as Error).stack },
      { status: 500 }
    );
  }
}
