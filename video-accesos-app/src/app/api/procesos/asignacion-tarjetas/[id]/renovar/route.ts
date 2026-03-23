import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const toNum = (v: unknown): number | null =>
  v === null || v === undefined ? null : Number(v);
const toStr = (v: unknown): string | null =>
  v === null || v === undefined ? null : String(v);

// POST /api/procesos/asignacion-tarjetas/[id]/renovar
// Renueva un Folio H: cierra la asignacion actual y crea una nueva con la misma tarjeta
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const asignacionId = parseInt(id, 10);

    if (isNaN(asignacionId)) {
      return NextResponse.json({ error: "ID invalido" }, { status: 400 });
    }

    // Buscar la asignacion actual (solo Folio H - tabla con renovacion)
    const rows = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT a.asignacion_id, a.tarjeta_id, a.tarjeta_id2, a.tarjeta_id3,
              a.tarjeta_id4, a.tarjeta_id5, a.residente_id, a.privada,
              a.lectura_tipo_id, a.lectura_epc, a.folio_contrato,
              a.estatus_id,
              a.numero_serie, a.numero_serie2, a.numero_serie3,
              a.numero_serie4, a.numero_serie5,
              CAST(NULLIF(a.fecha_vencimiento, '0000-00-00') AS CHAR) AS fecha_vencimiento,
              r.nombre AS res_nombre, r.ape_paterno AS res_ape_paterno,
              r.ape_materno AS res_ape_materno,
              res.residencia_id, res.nro_casa, res.calle,
              p.privada_id AS priv_id, p.descripcion AS priv_descripcion
       FROM residencias_residentes_tarjetas a
       INNER JOIN residencias_residentes r ON a.residente_id = r.residente_id
       INNER JOIN residencias res ON r.residencia_id = res.residencia_id
       INNER JOIN privadas p ON res.privada_id = p.privada_id
       WHERE a.asignacion_id = ?`,
      asignacionId
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "Asignacion Folio H no encontrada" },
        { status: 404 }
      );
    }

    const existente = rows[0];

    // Solo se puede renovar si esta activa (estatus_id=1)
    if (toNum(existente.estatus_id) !== 1) {
      return NextResponse.json(
        { error: "Solo se pueden renovar asignaciones activas" },
        { status: 400 }
      );
    }

    // Datos del body (opcionales - para precio, observaciones, nueva fecha)
    const body = await request.json().catch(() => ({}));
    const precio = body.precio !== undefined ? parseFloat(String(body.precio)) : 0;
    const observaciones = body.observaciones?.trim() || "";
    const concepto = body.concepto?.trim() || "RENOVACION";
    const tipoPago = body.tipoPago !== undefined ? parseInt(String(body.tipoPago), 10) : 0;

    // Nueva fecha de vencimiento: +1 año desde hoy (o la que envien)
    const hoy = new Date();
    let nuevaFechaVenc: string;
    if (body.fechaVencimiento) {
      nuevaFechaVenc = String(body.fechaVencimiento).split("T")[0];
    } else {
      const nuevaFecha = new Date(hoy);
      nuevaFecha.setFullYear(nuevaFecha.getFullYear() + 1);
      nuevaFechaVenc = nuevaFecha.toISOString().split("T")[0];
    }

    const fechaHoy = hoy.toISOString().split("T")[0];

    // 1. Marcar asignacion anterior como RENOVADA (estatus_id=3)
    await prisma.$executeRawUnsafe(
      `UPDATE residencias_residentes_tarjetas
       SET estatus_id = 3, fecha_modificacion = ?
       WHERE asignacion_id = ?`,
      fechaHoy,
      asignacionId
    );

    // 2. Crear nueva asignacion con los MISMOS datos de tarjeta y residente
    //    La tarjeta se mantiene en estatus 2 (asignada) - no hay gap
    await prisma.$executeRawUnsafe(
      `INSERT INTO residencias_residentes_tarjetas (
        tarjeta_id, tarjeta_id2, tarjeta_id3, tarjeta_id4, tarjeta_id5,
        numero_serie, numero_serie2, numero_serie3, numero_serie4, numero_serie5,
        residente_id, privada, fecha, fecha_vencimiento, fecha_modificacion,
        lectura_tipo_id, lectura_epc, folio_contrato,
        precio, descuento, IVA, tipo_pago,
        comprador_id, mostrar_nombre_comprador,
        concepto, motivo_descuento, observaciones,
        utilizo_seguro, utilizo_seguro2, utilizo_seguro3, utilizo_seguro4, utilizo_seguro5,
        interfon_extra,
        estatus_id, usuario_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      toStr(existente.tarjeta_id) || "",
      toStr(existente.tarjeta_id2) || "",
      toStr(existente.tarjeta_id3) || "",
      toStr(existente.tarjeta_id4) || "",
      toStr(existente.tarjeta_id5) || "",
      toStr(existente.numero_serie) || "",
      toStr(existente.numero_serie2) || "",
      toStr(existente.numero_serie3) || "",
      toStr(existente.numero_serie4) || "",
      toStr(existente.numero_serie5) || "",
      toStr(existente.residente_id),
      toNum(existente.privada) || 0,
      fechaHoy,
      nuevaFechaVenc,
      fechaHoy,
      toNum(existente.lectura_tipo_id) || 0,
      toStr(existente.lectura_epc) || "",
      toStr(existente.folio_contrato) || "",
      precio,
      0,     // descuento
      0,     // IVA
      tipoPago,
      "",    // comprador_id
      0,     // mostrar_nombre_comprador
      concepto,
      "",    // motivo_descuento
      observaciones
        ? `Renovacion de asignacion #${asignacionId}. ${observaciones}`
        : `Renovacion de asignacion #${asignacionId}`,
      0, 0, 0, 0, 0, // utilizo_seguro 1-5
      0,     // interfon_extra
      1,     // estatus_id (activa)
      0      // usuario_id
    );

    // Obtener ID de la nueva asignacion
    const [idResult] = await prisma.$queryRawUnsafe<Array<{ id: bigint }>>(
      "SELECT LAST_INSERT_ID() as id"
    );
    const newId = Number(idResult.id);

    // Leer el registro nuevo
    const [newRow] = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT a.asignacion_id,
              a.tarjeta_id, a.tarjeta_id2, a.tarjeta_id3, a.tarjeta_id4, a.tarjeta_id5,
              a.residente_id, a.estatus_id,
              CAST(NULLIF(a.fecha, '0000-00-00') AS CHAR) AS fecha,
              CAST(NULLIF(a.fecha_vencimiento, '0000-00-00') AS CHAR) AS fecha_vencimiento,
              a.lectura_tipo_id, a.lectura_epc, a.folio_contrato,
              a.precio, a.observaciones,
              r.nombre AS res_nombre, r.ape_paterno AS res_ape_paterno,
              r.ape_materno AS res_ape_materno,
              res.residencia_id, res.nro_casa, res.calle,
              p.privada_id AS priv_id, p.descripcion AS priv_descripcion,
              'H' AS folio_tipo
       FROM residencias_residentes_tarjetas a
       INNER JOIN residencias_residentes r ON a.residente_id = r.residente_id
       INNER JOIN residencias res ON r.residencia_id = res.residencia_id
       INNER JOIN privadas p ON res.privada_id = p.privada_id
       WHERE a.asignacion_id = ?`,
      newId
    );

    return NextResponse.json({
      message: "Tarjeta renovada exitosamente",
      asignacionAnterior: asignacionId,
      nuevaAsignacion: {
        id: toNum(newRow.asignacion_id),
        tarjetaId: toStr(newRow.tarjeta_id),
        residenteId: toStr(newRow.residente_id),
        fecha: toStr(newRow.fecha),
        fechaVencimiento: toStr(newRow.fecha_vencimiento),
        precio: toNum(newRow.precio),
        estatusId: toNum(newRow.estatus_id),
        folioTipo: "H",
        residente: {
          nombre: toStr(newRow.res_nombre),
          apePaterno: toStr(newRow.res_ape_paterno),
          apeMaterno: toStr(newRow.res_ape_materno),
          residencia: {
            nroCasa: toStr(newRow.nro_casa),
            calle: toStr(newRow.calle),
            privada: {
              id: toNum(newRow.priv_id),
              descripcion: toStr(newRow.priv_descripcion),
            },
          },
        },
      },
    }, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Error al renovar tarjeta:", msg, error);
    return NextResponse.json(
      { error: `Error al renovar tarjeta: ${msg}` },
      { status: 500 }
    );
  }
}
