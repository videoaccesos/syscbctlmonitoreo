import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/procesos/asignacion-tarjetas/[id]/comprobante - Generar comprobante HTML imprimible
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
    const asignacionId = parseInt(id, 10);

    if (isNaN(asignacionId)) {
      return NextResponse.json({ error: "ID invalido" }, { status: 400 });
    }

    // Columnas comunes (sin fecha_vencimiento que solo existe en tabla H)
    const commonCols = `asignacion_id, privada, tarjeta_id, tarjeta_id2, tarjeta_id3,
             tarjeta_id4, tarjeta_id5, numero_serie, numero_serie2, numero_serie3,
             numero_serie4, numero_serie5, residente_id, comprador_id,
             mostrar_nombre_comprador, fecha, lectura_tipo_id, lectura_epc,
             folio_contrato, precio, descuento, IVA, utilizo_seguro, utilizo_seguro2,
             utilizo_seguro3, utilizo_seguro4, utilizo_seguro5, concepto,
             estatus_id, fecha_modificacion, tipo_pago,
             usuario_id, observaciones`;

    // Buscar en ambas tablas
    const dataSql = `
      SELECT a.asignacion_id, a.tarjeta_id, a.tarjeta_id2, a.tarjeta_id3,
             a.tarjeta_id4, a.tarjeta_id5, a.residente_id,
             CAST(NULLIF(a.fecha, '0000-00-00') AS CHAR) AS fecha,
             a.fecha_vencimiento,
             a.lectura_tipo_id, a.lectura_epc, a.folio_contrato,
             a.precio, a.descuento, a.IVA, a.tipo_pago,
             a.comprador_id, a.concepto, a.observaciones,
             a.estatus_id, a.folio_tipo,
             a.utilizo_seguro, a.utilizo_seguro2, a.utilizo_seguro3,
             a.utilizo_seguro4, a.utilizo_seguro5,
             r.nombre AS res_nombre, r.ape_paterno AS res_ape_paterno,
             r.ape_materno AS res_ape_materno,
             res.nro_casa, res.calle,
             p.descripcion AS priv_descripcion
      FROM (
        SELECT ${commonCols},
               CAST(NULLIF(fecha_vencimiento, '0000-00-00') AS CHAR) AS fecha_vencimiento,
               'H' AS folio_tipo
        FROM residencias_residentes_tarjetas WHERE asignacion_id = ?
        UNION ALL
        SELECT ${commonCols},
               NULL AS fecha_vencimiento,
               'B' AS folio_tipo
        FROM residencias_residentes_tarjetas_no_renovacion WHERE asignacion_id = ?
      ) a
      INNER JOIN residencias_residentes r ON a.residente_id = r.residente_id
      INNER JOIN residencias res ON r.residencia_id = res.residencia_id
      INNER JOIN privadas p ON res.privada_id = p.privada_id
      LIMIT 1
    `;

    const rows = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      dataSql,
      asignacionId,
      asignacionId
    );

    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { error: "Asignacion no encontrada" },
        { status: 404 }
      );
    }

    const row = rows[0];

    // Buscar lecturas de tarjetas asignadas
    const tarjetaIds = [
      row.tarjeta_id,
      row.tarjeta_id2,
      row.tarjeta_id3,
      row.tarjeta_id4,
      row.tarjeta_id5,
    ]
      .filter((tid) => tid && String(tid).trim() !== "")
      .map((tid) => parseInt(String(tid), 10))
      .filter((tid) => !isNaN(tid));

    let tarjetasMap: Record<number, { lectura: string; tipoId: number }> = {};
    if (tarjetaIds.length > 0) {
      const tarjetas = await prisma.tarjeta.findMany({
        where: { id: { in: tarjetaIds } },
        select: { id: true, lectura: true, tipoId: true },
      });
      tarjetasMap = Object.fromEntries(
        tarjetas.map((t) => [t.id, { lectura: t.lectura, tipoId: t.tipoId }])
      );
    }

    // Buscar comprador si existe
    let compradorNombre = "";
    if (row.comprador_id && String(row.comprador_id).trim() !== "") {
      const comprador = await prisma.residente.findFirst({
        where: { id: String(row.comprador_id) },
        select: { nombre: true, apePaterno: true, apeMaterno: true },
      });
      if (comprador) {
        compradorNombre = `${comprador.apePaterno} ${comprador.apeMaterno} ${comprador.nombre}`;
      }
    }

    const fmtDate = (v: unknown): string => {
      if (!v) return "-";
      try {
        return new Date(String(v)).toLocaleDateString("es-MX", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        });
      } catch {
        return String(v);
      }
    };

    const fmtMoney = (v: unknown): string => {
      const n = Number(v) || 0;
      return `$${n.toFixed(2)}`;
    };

    const tipoTarjeta = (tipoId: number) =>
      tipoId === 2 ? "Vehicular" : "Peatonal";
    const tipoPago = Number(row.tipo_pago) === 2 ? "Bancos" : "Efectivo";
    const estatus = Number(row.estatus_id) === 1 ? "Activa" : "Cancelada";
    const folioTipo =
      row.folio_tipo === "H" ? "H - Con Renovacion" : "B - Sin Renovacion";

    const precio = Number(row.precio) || 0;
    const descuento = Number(row.descuento) || 0;
    const iva = Number(row.IVA) || 0;
    const total = precio - descuento + iva;

    // Generar filas de tarjetas
    const tarjetaSlots = [
      {
        id: row.tarjeta_id,
        seguro: row.utilizo_seguro,
      },
      {
        id: row.tarjeta_id2,
        seguro: row.utilizo_seguro2,
      },
      {
        id: row.tarjeta_id3,
        seguro: row.utilizo_seguro3,
      },
      {
        id: row.tarjeta_id4,
        seguro: row.utilizo_seguro4,
      },
      {
        id: row.tarjeta_id5,
        seguro: row.utilizo_seguro5,
      },
    ].filter((s) => s.id && String(s.id).trim() !== "");

    const tarjetaRows = tarjetaSlots
      .map((slot) => {
        const tid = parseInt(String(slot.id), 10);
        const info = tarjetasMap[tid];
        return `
        <tr>
          <td style="padding:6px 12px;border:1px solid #ddd;">${info?.lectura || slot.id}</td>
          <td style="padding:6px 12px;border:1px solid #ddd;">${info ? tipoTarjeta(info.tipoId) : "-"}</td>
          <td style="padding:6px 12px;border:1px solid #ddd;text-align:center;">${Number(slot.seguro) === 1 ? "Si" : "No"}</td>
        </tr>`;
      })
      .join("");

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Comprobante de Asignacion #${row.asignacion_id}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: #333; padding: 20px; }
    .container { max-width: 700px; margin: 0 auto; }
    .header { text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 12px; margin-bottom: 16px; }
    .header h1 { font-size: 18px; color: #1e40af; }
    .header p { font-size: 11px; color: #666; margin-top: 4px; }
    .badge { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 11px; font-weight: bold; }
    .badge-h { background: #dbeafe; color: #1e40af; }
    .badge-b { background: #ffedd5; color: #c2410c; }
    .badge-activa { background: #dcfce7; color: #166534; }
    .badge-cancelada { background: #fee2e2; color: #991b1b; }
    .section { margin-bottom: 14px; }
    .section-title { font-size: 13px; font-weight: bold; color: #1e40af; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; margin-bottom: 8px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 20px; }
    .field { display: flex; gap: 4px; }
    .label { font-weight: bold; color: #555; white-space: nowrap; }
    .value { color: #111; }
    table { width: 100%; border-collapse: collapse; margin-top: 6px; }
    th { background: #f1f5f9; padding: 6px 12px; border: 1px solid #ddd; text-align: left; font-size: 12px; }
    .totals { margin-top: 10px; text-align: right; }
    .totals .row { display: flex; justify-content: flex-end; gap: 16px; padding: 3px 0; }
    .totals .total-final { font-size: 16px; font-weight: bold; color: #1e40af; border-top: 2px solid #2563eb; padding-top: 6px; }
    .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #999; border-top: 1px solid #e5e7eb; padding-top: 10px; }
    .firma { margin-top: 50px; display: flex; justify-content: space-around; }
    .firma-line { width: 200px; text-align: center; }
    .firma-line hr { border: none; border-top: 1px solid #333; margin-bottom: 4px; }
    .firma-line span { font-size: 11px; color: #666; }
    @media print {
      body { padding: 0; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="text-align:center;margin-bottom:16px;">
    <button onclick="window.print()" style="padding:8px 24px;background:#2563eb;color:white;border:none;border-radius:6px;cursor:pointer;font-size:14px;">
      Imprimir Comprobante
    </button>
  </div>

  <div class="container">
    <div class="header">
      <h1>COMPROBANTE DE ASIGNACION DE TARJETA</h1>
      <p>Sistema de Control de Accesos</p>
      <div style="margin-top:8px;">
        <span class="badge ${row.folio_tipo === "H" ? "badge-h" : "badge-b"}">Folio ${folioTipo}</span>
        <span class="badge ${Number(row.estatus_id) === 1 ? "badge-activa" : "badge-cancelada"}" style="margin-left:8px;">${estatus}</span>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Datos de la Asignacion</div>
      <div class="grid">
        <div class="field"><span class="label">No. Asignacion:</span> <span class="value">${row.asignacion_id}</span></div>
        <div class="field"><span class="label">Fecha:</span> <span class="value">${fmtDate(row.fecha)}</span></div>
        <div class="field"><span class="label">Folio Contrato:</span> <span class="value">${row.folio_contrato || "-"}</span></div>
        ${row.folio_tipo === "H" ? `<div class="field"><span class="label">Vencimiento:</span> <span class="value">${fmtDate(row.fecha_vencimiento)}</span></div>` : ""}
      </div>
    </div>

    <div class="section">
      <div class="section-title">Residente</div>
      <div class="grid">
        <div class="field"><span class="label">Nombre:</span> <span class="value">${row.res_ape_paterno} ${row.res_ape_materno} ${row.res_nombre}</span></div>
        <div class="field"><span class="label">Privada:</span> <span class="value">${row.priv_descripcion}</span></div>
        <div class="field"><span class="label">Domicilio:</span> <span class="value">Casa #${row.nro_casa}, ${row.calle}</span></div>
        ${compradorNombre ? `<div class="field"><span class="label">Comprador:</span> <span class="value">${compradorNombre}</span></div>` : ""}
      </div>
    </div>

    <div class="section">
      <div class="section-title">Tarjeta(s) Asignada(s)</div>
      <table>
        <thead>
          <tr>
            <th>Lectura</th>
            <th>Tipo</th>
            <th style="text-align:center;">Seguro</th>
          </tr>
        </thead>
        <tbody>
          ${tarjetaRows || '<tr><td colspan="3" style="padding:6px 12px;border:1px solid #ddd;text-align:center;">-</td></tr>'}
        </tbody>
      </table>
    </div>

    <div class="section">
      <div class="section-title">Detalle de Pago</div>
      <div class="totals">
        <div class="row"><span class="label">Subtotal:</span> <span>${fmtMoney(precio)}</span></div>
        ${descuento > 0 ? `<div class="row"><span class="label">Descuento:</span> <span>-${fmtMoney(descuento)}</span></div>` : ""}
        ${iva > 0 ? `<div class="row"><span class="label">IVA (16%):</span> <span>${fmtMoney(iva)}</span></div>` : ""}
        <div class="row total-final"><span class="label">TOTAL:</span> <span>${fmtMoney(total)}</span></div>
        <div class="row" style="margin-top:4px;"><span class="label">Forma de Pago:</span> <span>${tipoPago}</span></div>
      </div>
    </div>

    ${row.concepto ? `<div class="section"><div class="section-title">Concepto</div><p>${row.concepto}</p></div>` : ""}
    ${row.observaciones && String(row.observaciones).trim() ? `<div class="section"><div class="section-title">Observaciones</div><p>${row.observaciones}</p></div>` : ""}

    <div class="firma">
      <div class="firma-line">
        <hr />
        <span>Firma del Residente</span>
      </div>
      <div class="firma-line">
        <hr />
        <span>Firma del Operador</span>
      </div>
    </div>

    <div class="footer">
      Documento generado el ${new Date().toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}
      &bull; Sistema de Control de Accesos
    </div>
  </div>
</body>
</html>`;

    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("Error al generar comprobante:", error);
    return NextResponse.json(
      { error: "Error al generar comprobante" },
      { status: 500 }
    );
  }
}
