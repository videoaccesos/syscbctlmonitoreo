import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/dev/analisis-observaciones - Temporal: analizar patrones de observaciones
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // 1. Todas las observaciones no vacías de los últimos 12 meses
    const observaciones = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(`
      SELECT asignacion_id, tarjeta_id, tarjeta_id2, tarjeta_id3, tarjeta_id4, tarjeta_id5,
             observaciones, folio_contrato,
             CAST(NULLIF(fecha, '0000-00-00') AS CHAR) AS fecha,
             CAST(NULLIF(fecha_vencimiento, '0000-00-00') AS CHAR) AS fecha_vencimiento,
             estatus_id, residente_id,
             'H' AS folio_tipo
      FROM residencias_residentes_tarjetas
      WHERE observaciones IS NOT NULL AND observaciones != ''
        AND fecha >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
      ORDER BY fecha DESC
    `);

    // 2. Patrones únicos agrupados
    const patrones = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(`
      SELECT observaciones, COUNT(*) AS cantidad
      FROM residencias_residentes_tarjetas
      WHERE observaciones IS NOT NULL AND observaciones != ''
        AND fecha >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
      GROUP BY observaciones
      ORDER BY cantidad DESC
      LIMIT 100
    `);

    // 3. También buscar en toda la historia (no solo 12 meses) para ver todos los patrones
    const todosPatrones = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(`
      SELECT observaciones, COUNT(*) AS cantidad
      FROM residencias_residentes_tarjetas
      WHERE observaciones IS NOT NULL AND observaciones != ''
      GROUP BY observaciones
      ORDER BY cantidad DESC
      LIMIT 200
    `);

    // 4. Buscar específicamente las que parecen reposiciones (contienen números de tarjeta)
    const posiblesReposiciones = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(`
      SELECT a.asignacion_id, a.tarjeta_id, a.observaciones, a.folio_contrato,
             CAST(NULLIF(a.fecha, '0000-00-00') AS CHAR) AS fecha,
             CAST(NULLIF(a.fecha_vencimiento, '0000-00-00') AS CHAR) AS fecha_vencimiento,
             a.estatus_id,
             CONCAT_WS(' ', r.nombre, r.ape_paterno, r.ape_materno) AS residente
      FROM residencias_residentes_tarjetas a
      INNER JOIN residencias_residentes r ON a.residente_id = r.residente_id
      WHERE a.observaciones IS NOT NULL AND a.observaciones != ''
        AND (
          a.observaciones LIKE '%repo%'
          OR a.observaciones LIKE '%garan%'
          OR a.observaciones LIKE '%cambio%'
          OR a.observaciones LIKE '%sustit%'
          OR a.observaciones LIKE '%reempla%'
          OR a.observaciones LIKE '%anterior%'
          OR a.observaciones LIKE '%tarj%'
          OR a.observaciones REGEXP '[0-9]{3,}'
        )
      ORDER BY a.fecha DESC
      LIMIT 200
    `);

    const serialize = (rows: Array<Record<string, unknown>>) =>
      rows.map((row) => {
        const obj: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(row)) {
          obj[k] = typeof v === "bigint" ? Number(v) : v;
        }
        return obj;
      });

    return NextResponse.json({
      totalObservaciones12Meses: observaciones.length,
      patrones12Meses: serialize(patrones),
      todosPatrones: serialize(todosPatrones),
      posiblesReposiciones: serialize(posiblesReposiciones),
      muestra: serialize(observaciones.slice(0, 50)),
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Error analisis:", msg, error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
