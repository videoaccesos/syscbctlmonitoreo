import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Parsea "VENCE DD/MM/YYYY" o "VENCE EN DD/MM/YYYY" de las observaciones
function parseVenceDate(obs: string): string | null {
  // Patrones: "VENCE DD/MM/YYYY", "VENCE EN DD/MM/YYYY"
  const match = obs.match(/VENCE\s*(?:EN\s+)?(\d{2})\/(\d{2})\/(\d{4})/i);
  if (!match) return null;
  const [, dd, mm, yyyy] = match;
  // Validar fecha
  const d = new Date(`${yyyy}-${mm}-${dd}`);
  if (isNaN(d.getTime())) return null;
  return `${yyyy}-${mm}-${dd}`;
}

// Parsea el número de tarjeta dada de baja
function parseBajaTarjeta(obs: string): string | null {
  const match = obs.match(/BAJA[:\s-]*(\d{3,})/i);
  return match ? match[1] : null;
}

type Correccion = {
  asignacion_id: number;
  tarjeta_id: string;
  observaciones: string;
  fecha: string | null;
  fecha_vencimiento_actual: string | null;
  fecha_vencimiento_correcta: string;
  baja_tarjeta: string | null;
  residente: string;
  privada: string;
  nro_casa: string;
  necesita_correccion: boolean;
};

// GET: analizar y mostrar preview de correcciones
// POST: ejecutar las correcciones
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Buscar todas las tarjetas con observaciones que indican reposición/cambio/garantía
    // y que contienen "VENCE" con fecha
    const rows = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(`
      SELECT a.asignacion_id, a.tarjeta_id, a.observaciones,
             CAST(NULLIF(a.fecha, '0000-00-00') AS CHAR) AS fecha,
             CAST(NULLIF(a.fecha_vencimiento, '0000-00-00') AS CHAR) AS fecha_vencimiento,
             a.estatus_id,
             CONCAT_WS(' ', r.nombre, r.ape_paterno, r.ape_materno) AS residente,
             p.descripcion AS privada, res.nro_casa
      FROM residencias_residentes_tarjetas a
      INNER JOIN residencias_residentes r ON a.residente_id = r.residente_id
      INNER JOIN residencias res ON r.residencia_id = res.residencia_id
      INNER JOIN privadas p ON res.privada_id = p.privada_id
      WHERE a.estatus_id = 1
        AND a.observaciones REGEXP 'VENCE'
      ORDER BY a.fecha DESC
    `);

    const correcciones: Correccion[] = [];
    let yaCorrectas = 0;

    for (const row of rows) {
      const obs = String(row.observaciones || "");
      const venceDate = parseVenceDate(obs);
      if (!venceDate) continue;

      const fechaVencActual = row.fecha_vencimiento ? String(row.fecha_vencimiento) : null;
      const necesita = fechaVencActual !== venceDate;

      if (!necesita) {
        yaCorrectas++;
        continue;
      }

      correcciones.push({
        asignacion_id: Number(row.asignacion_id),
        tarjeta_id: String(row.tarjeta_id),
        observaciones: obs,
        fecha: row.fecha ? String(row.fecha) : null,
        fecha_vencimiento_actual: fechaVencActual,
        fecha_vencimiento_correcta: venceDate,
        baja_tarjeta: parseBajaTarjeta(obs),
        residente: String(row.residente || ""),
        privada: String(row.privada || ""),
        nro_casa: String(row.nro_casa || ""),
        necesita_correccion: true,
      });
    }

    return NextResponse.json({
      totalAnalizadas: rows.length,
      yaCorrectas,
      porCorregir: correcciones.length,
      correcciones,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Error análisis observaciones:", msg, error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST: ejecutar las correcciones
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { asignacion_ids } = body as { asignacion_ids?: number[] };

    // Si no se pasan IDs específicos, obtener todos los que necesitan corrección
    let targetIds: number[] = [];

    if (asignacion_ids && asignacion_ids.length > 0) {
      targetIds = asignacion_ids;
    } else {
      // Obtener todos los candidatos
      const rows = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(`
        SELECT asignacion_id, observaciones,
               CAST(NULLIF(fecha_vencimiento, '0000-00-00') AS CHAR) AS fecha_vencimiento
        FROM residencias_residentes_tarjetas
        WHERE estatus_id = 1
          AND observaciones REGEXP 'VENCE'
      `);

      for (const row of rows) {
        const obs = String(row.observaciones || "");
        const venceDate = parseVenceDate(obs);
        if (!venceDate) continue;
        const actual = row.fecha_vencimiento ? String(row.fecha_vencimiento) : null;
        if (actual !== venceDate) {
          targetIds.push(Number(row.asignacion_id));
        }
      }
    }

    if (targetIds.length === 0) {
      return NextResponse.json({ message: "No hay correcciones pendientes", actualizadas: 0 });
    }

    // Para cada ID, parsear la fecha de la observación y actualizar
    let actualizadas = 0;
    const errores: Array<{ asignacion_id: number; error: string }> = [];

    for (const id of targetIds) {
      try {
        const [row] = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
          `SELECT observaciones FROM residencias_residentes_tarjetas WHERE asignacion_id = ?`,
          id
        );
        if (!row) {
          errores.push({ asignacion_id: id, error: "No encontrada" });
          continue;
        }

        const venceDate = parseVenceDate(String(row.observaciones || ""));
        if (!venceDate) {
          errores.push({ asignacion_id: id, error: "No se pudo parsear fecha VENCE" });
          continue;
        }

        await prisma.$executeRawUnsafe(
          `UPDATE residencias_residentes_tarjetas
           SET fecha_vencimiento = ?
           WHERE asignacion_id = ?`,
          venceDate,
          id
        );
        actualizadas++;
      } catch (err) {
        errores.push({
          asignacion_id: id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return NextResponse.json({
      message: `Se actualizaron ${actualizadas} de ${targetIds.length} tarjetas`,
      actualizadas,
      errores: errores.length > 0 ? errores : undefined,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Error corrección vencimientos:", msg, error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
