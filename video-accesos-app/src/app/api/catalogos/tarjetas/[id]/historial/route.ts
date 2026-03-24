import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const toNum = (v: unknown): number | null =>
  v === null || v === undefined ? null : Number(v);
const toStr = (v: unknown): string | null =>
  v === null || v === undefined ? null : String(v);

// GET /api/catalogos/tarjetas/[id]/historial
// Devuelve el historial completo de asignaciones de una tarjeta
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

    // Obtener info de la tarjeta
    const tarjeta = await prisma.tarjeta.findUnique({
      where: { id: tarjetaId },
    });

    if (!tarjeta) {
      return NextResponse.json({ error: "Tarjeta no encontrada" }, { status: 404 });
    }

    const tid = String(tarjetaId);

    // Buscar en ambas tablas de asignaciones donde esta tarjeta aparezca en cualquier slot
    const condSlots = `(a.tarjeta_id = ? OR a.tarjeta_id2 = ? OR a.tarjeta_id3 = ? OR a.tarjeta_id4 = ? OR a.tarjeta_id5 = ?)`;

    const sqlH = `
      SELECT a.asignacion_id, a.tarjeta_id, a.tarjeta_id2, a.tarjeta_id3,
             a.tarjeta_id4, a.tarjeta_id5, a.residente_id,
             CAST(NULLIF(a.fecha, '0000-00-00') AS CHAR) AS fecha,
             CAST(NULLIF(a.fecha_vencimiento, '0000-00-00') AS CHAR) AS fecha_vencimiento,
             a.precio, a.estatus_id, a.concepto, a.observaciones,
             'H' AS folio_tipo,
             r.nombre AS res_nombre, r.ape_paterno AS res_ape_paterno,
             r.ape_materno AS res_ape_materno,
             res.residencia_id, res.nro_casa, res.calle,
             p.privada_id AS priv_id, p.descripcion AS priv_descripcion
      FROM residencias_residentes_tarjetas a
      INNER JOIN residencias_residentes r ON a.residente_id = r.residente_id
      INNER JOIN residencias res ON r.residencia_id = res.residencia_id
      INNER JOIN privadas p ON res.privada_id = p.privada_id
      WHERE ${condSlots}
      ORDER BY a.asignacion_id DESC
    `;

    const sqlB = `
      SELECT a.asignacion_id, a.tarjeta_id, a.tarjeta_id2, a.tarjeta_id3,
             a.tarjeta_id4, a.tarjeta_id5, a.residente_id,
             CAST(NULLIF(a.fecha, '0000-00-00') AS CHAR) AS fecha,
             NULL AS fecha_vencimiento,
             a.precio, a.estatus_id, a.concepto, a.observaciones,
             'B' AS folio_tipo,
             r.nombre AS res_nombre, r.ape_paterno AS res_ape_paterno,
             r.ape_materno AS res_ape_materno,
             res.residencia_id, res.nro_casa, res.calle,
             p.privada_id AS priv_id, p.descripcion AS priv_descripcion
      FROM residencias_residentes_tarjetas_no_renovacion a
      INNER JOIN residencias_residentes r ON a.residente_id = r.residente_id
      INNER JOIN residencias res ON r.residencia_id = res.residencia_id
      INNER JOIN privadas p ON res.privada_id = p.privada_id
      WHERE ${condSlots}
      ORDER BY a.asignacion_id DESC
    `;

    const [rowsH, rowsB] = await Promise.all([
      prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
        sqlH, tid, tid, tid, tid, tid
      ),
      prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
        sqlB, tid, tid, tid, tid, tid
      ),
    ]);

    const ESTATUS_LABELS: Record<number, string> = {
      1: "Activa",
      2: "Cancelada",
      3: "Renovada",
    };

    const mapRow = (row: Record<string, unknown>) => ({
      id: toNum(row.asignacion_id),
      tarjetaId: toStr(row.tarjeta_id),
      tarjetaId2: toStr(row.tarjeta_id2),
      tarjetaId3: toStr(row.tarjeta_id3),
      tarjetaId4: toStr(row.tarjeta_id4),
      tarjetaId5: toStr(row.tarjeta_id5),
      fecha: toStr(row.fecha),
      fechaVencimiento: toStr(row.fecha_vencimiento),
      precio: toNum(row.precio),
      estatusId: toNum(row.estatus_id),
      estatusLabel: ESTATUS_LABELS[toNum(row.estatus_id) || 0] || `Estatus ${row.estatus_id}`,
      concepto: toStr(row.concepto),
      observaciones: toStr(row.observaciones),
      folioTipo: toStr(row.folio_tipo),
      residente: `${toStr(row.res_ape_paterno) || ""} ${toStr(row.res_ape_materno) || ""} ${toStr(row.res_nombre) || ""}`.trim(),
      residencia: `Casa ${toStr(row.nro_casa) || ""}, ${toStr(row.calle) || ""}`,
      privada: toStr(row.priv_descripcion),
    });

    const historial = [
      ...rowsH.map(mapRow),
      ...rowsB.map(mapRow),
    ].sort((a, b) => (b.id || 0) - (a.id || 0));

    return NextResponse.json({
      tarjeta: {
        id: tarjeta.id,
        lectura: tarjeta.lectura,
        tipoId: tarjeta.tipoId,
        estatusId: tarjeta.estatusId,
      },
      historial,
      total: historial.length,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Error al obtener historial de tarjeta:", msg);
    return NextResponse.json(
      { error: `Error al obtener historial: ${msg}` },
      { status: 500 }
    );
  }
}
