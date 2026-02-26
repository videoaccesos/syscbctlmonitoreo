import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Helper para serializar BigInt a Number en JSON
function toJSON(data: unknown): unknown {
  return JSON.parse(
    JSON.stringify(data, (_key, value) =>
      typeof value === "bigint" ? Number(value) : value
    )
  );
}

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

    // 1. Estructura de la columna
    const describe = await prisma.$queryRawUnsafe(
      `SHOW COLUMNS FROM privadas WHERE Field = 'vence_contrato'`
    );

    // 2. sql_mode actual
    const sqlMode = await prisma.$queryRawUnsafe(`SELECT @@sql_mode as mode`);

    // 3. Todos los datos de privadas
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

    return NextResponse.json(toJSON({
      sqlMode,
      columnInfo: describe,
      counts: zeroCounts,
      data: allData,
    }));
  } catch (error) {
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}

// POST para arreglar: ALTER columna + limpiar zero-dates
export async function POST() {
  try {
    // Desactivar restricciones de zero-date
    await prisma.$executeRawUnsafe(
      `SET SESSION sql_mode = REPLACE(@@sql_mode, 'NO_ZERO_DATE', '')`
    );
    await prisma.$executeRawUnsafe(
      `SET SESSION sql_mode = REPLACE(@@sql_mode, 'NO_ZERO_IN_DATE', '')`
    );

    // 1. ALTER: permitir NULL en vence_contrato
    await prisma.$executeRawUnsafe(
      `ALTER TABLE privadas MODIFY COLUMN vence_contrato DATE NULL DEFAULT NULL`
    );

    // 2. Limpiar zero-dates
    const fixed = await prisma.$executeRawUnsafe(
      `UPDATE privadas SET vence_contrato = NULL WHERE CAST(vence_contrato AS CHAR) = '0000-00-00'`
    );

    // 3. Verificar
    const afterFix = await prisma.$queryRawUnsafe(
      `SELECT privada_id, descripcion,
              CAST(vence_contrato AS CHAR) as vence_contrato_raw
       FROM privadas`
    );

    const describe = await prisma.$queryRawUnsafe(
      `SHOW COLUMNS FROM privadas WHERE Field = 'vence_contrato'`
    );

    return NextResponse.json(toJSON({
      rowsFixed: fixed,
      columnAfterAlter: describe,
      dataAfterFix: afterFix,
    }));
  } catch (error) {
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
