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
    const tipoPagoLabel = Number(row.tipo_pago) === 2 ? "Bancos" : "Efectivo";
    const estatusLabel = Number(row.estatus_id) === 1 ? "Activa" : "Cancelada";
    const folioTipoLabel =
      row.folio_tipo === "H" ? "Con Renovacion" : "Sin Renovacion";

    const precio = Number(row.precio) || 0;
    const descuento = Number(row.descuento) || 0;
    const iva = Number(row.IVA) || 0;
    const total = precio - descuento + iva;

    // Generar filas de tarjetas
    const tarjetaSlots = [
      { id: row.tarjeta_id, seguro: row.utilizo_seguro },
      { id: row.tarjeta_id2, seguro: row.utilizo_seguro2 },
      { id: row.tarjeta_id3, seguro: row.utilizo_seguro3 },
      { id: row.tarjeta_id4, seguro: row.utilizo_seguro4 },
      { id: row.tarjeta_id5, seguro: row.utilizo_seguro5 },
    ].filter((s) => s.id && String(s.id).trim() !== "");

    const tarjetaRows = tarjetaSlots
      .map((slot, idx) => {
        const tid = parseInt(String(slot.id), 10);
        const info = tarjetasMap[tid];
        const tipoClass = info?.tipoId === 2 ? "badge-vehicular" : "badge-peatonal";
        const tipoLabel = info ? tipoTarjeta(info.tipoId) : "-";
        return `
        <tr>
          <td class="td-center">${idx + 1}</td>
          <td><span class="mono">${info?.lectura || slot.id}</span></td>
          <td class="td-center"><span class="badge ${tipoClass}">${tipoLabel}</span></td>
          <td class="td-center">${Number(slot.seguro) === 1 ? '<span class="check">&#10003;</span>' : '<span class="nocheck">-</span>'}</td>
        </tr>`;
      })
      .join("");

    const residenteNombre = `${row.res_ape_paterno} ${row.res_ape_materno} ${row.res_nombre}`;
    const fechaGeneracion = new Date().toLocaleDateString("es-MX", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Recibo #${row.asignacion_id}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 13px; color: #1f2937; background: #f3f4f6; padding: 24px;
      -webkit-print-color-adjust: exact; print-color-adjust: exact;
    }
    .receipt {
      max-width: 680px; margin: 0 auto; background: white;
      border-radius: 16px; overflow: hidden;
      box-shadow: 0 4px 24px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.06);
    }

    /* Header */
    .header {
      background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%);
      color: white; padding: 28px 32px; position: relative; overflow: hidden;
    }
    .header::after {
      content: ''; position: absolute; top: -50%; right: -20%; width: 300px; height: 300px;
      background: rgba(255,255,255,0.05); border-radius: 50%;
    }
    .header-top { display: flex; justify-content: space-between; align-items: flex-start; position: relative; z-index: 1; }
    .header-brand h1 { font-size: 16px; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 2px; }
    .header-brand p { font-size: 11px; opacity: 0.7; font-weight: 400; }
    .header-id { text-align: right; }
    .header-id .folio-num { font-size: 28px; font-weight: 800; line-height: 1; letter-spacing: -1px; }
    .header-id .folio-label { font-size: 10px; text-transform: uppercase; letter-spacing: 1.5px; opacity: 0.7; }
    .header-badges { display: flex; gap: 8px; margin-top: 14px; position: relative; z-index: 1; }
    .hbadge {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600;
    }
    .hbadge-folio { background: rgba(255,255,255,0.2); color: white; }
    .hbadge-activa { background: #22c55e; color: white; }
    .hbadge-cancelada { background: #ef4444; color: white; }
    .hbadge-dot { width: 6px; height: 6px; border-radius: 50%; }
    .hbadge-activa .hbadge-dot { background: #bbf7d0; }
    .hbadge-cancelada .hbadge-dot { background: #fecaca; }

    /* Body */
    .body { padding: 28px 32px; }

    /* Info grid */
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }
    .info-card {
      background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px;
    }
    .info-card-title {
      font-size: 10px; text-transform: uppercase; letter-spacing: 1.2px;
      color: #64748b; font-weight: 600; margin-bottom: 10px;
      display: flex; align-items: center; gap: 6px;
    }
    .info-card-title svg { width: 14px; height: 14px; }
    .info-row { display: flex; justify-content: space-between; padding: 4px 0; }
    .info-label { color: #64748b; font-size: 12px; font-weight: 500; }
    .info-value { color: #1e293b; font-size: 12px; font-weight: 600; text-align: right; }
    .info-value.highlight { color: #2563eb; font-weight: 700; }

    /* Full width card */
    .info-card-full { grid-column: 1 / -1; }

    /* Tarjetas table */
    .card-table { width: 100%; border-collapse: separate; border-spacing: 0; margin-bottom: 24px; }
    .card-table thead th {
      background: #f1f5f9; padding: 10px 14px; font-size: 11px; font-weight: 600;
      text-transform: uppercase; letter-spacing: 0.5px; color: #475569;
      border-bottom: 2px solid #e2e8f0;
    }
    .card-table thead th:first-child { border-radius: 8px 0 0 0; }
    .card-table thead th:last-child { border-radius: 0 8px 0 0; }
    .card-table tbody td {
      padding: 12px 14px; border-bottom: 1px solid #f1f5f9; font-size: 13px;
    }
    .card-table tbody tr:last-child td { border-bottom: none; }
    .card-table tbody tr:hover { background: #f8fafc; }
    .td-center { text-align: center; }
    .mono { font-family: 'SF Mono', 'Cascadia Code', 'Consolas', monospace; font-weight: 600; letter-spacing: 0.5px; }
    .badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; }
    .badge-vehicular { background: #dbeafe; color: #1d4ed8; }
    .badge-peatonal { background: #fef3c7; color: #92400e; }
    .check { color: #16a34a; font-weight: 700; font-size: 16px; }
    .nocheck { color: #cbd5e1; }

    /* Payment section */
    .payment-section {
      background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
      border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px; margin-bottom: 24px;
    }
    .payment-title {
      font-size: 10px; text-transform: uppercase; letter-spacing: 1.2px;
      color: #64748b; font-weight: 600; margin-bottom: 12px;
    }
    .payment-rows { }
    .payment-row { display: flex; justify-content: space-between; padding: 5px 0; font-size: 13px; }
    .payment-row .label { color: #64748b; }
    .payment-row .value { font-weight: 600; color: #334155; }
    .payment-row.discount .value { color: #dc2626; }
    .payment-divider { border: none; border-top: 2px solid #cbd5e1; margin: 10px 0; }
    .payment-total { display: flex; justify-content: space-between; padding: 8px 0; }
    .payment-total .label { font-size: 14px; font-weight: 700; color: #1e293b; }
    .payment-total .value { font-size: 22px; font-weight: 800; color: #1e3a5f; }
    .payment-method {
      margin-top: 10px; padding-top: 10px; border-top: 1px solid #e2e8f0;
      display: flex; justify-content: space-between; font-size: 12px;
    }
    .payment-method .label { color: #64748b; }
    .payment-method .value { font-weight: 600; color: #334155; }

    /* Notes */
    .notes {
      background: #fffbeb; border: 1px solid #fde68a; border-radius: 10px;
      padding: 14px 16px; margin-bottom: 24px; font-size: 12px; color: #92400e;
    }
    .notes-title { font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }

    /* Signatures */
    .signatures { display: flex; justify-content: space-around; margin: 40px 0 20px; gap: 40px; }
    .sig-block { flex: 1; text-align: center; }
    .sig-line { border-top: 1.5px solid #94a3b8; margin-bottom: 6px; width: 100%; }
    .sig-label { font-size: 11px; color: #64748b; font-weight: 500; }

    /* Footer */
    .footer {
      text-align: center; padding: 16px 32px; background: #f8fafc;
      border-top: 1px solid #e2e8f0; font-size: 10px; color: #94a3b8;
    }

    /* Print */
    .no-print { text-align: center; margin-bottom: 20px; }
    .btn-print {
      padding: 10px 28px; background: linear-gradient(135deg, #1e3a5f, #2563eb);
      color: white; border: none; border-radius: 8px; cursor: pointer;
      font-size: 14px; font-weight: 600; font-family: inherit;
      box-shadow: 0 2px 8px rgba(37,99,235,0.3);
      transition: transform 0.15s, box-shadow 0.15s;
    }
    .btn-print:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(37,99,235,0.4); }
    @media print {
      body { padding: 0; background: white; }
      .receipt { box-shadow: none; border-radius: 0; }
      .no-print { display: none !important; }
      .header { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="no-print">
    <button class="btn-print" onclick="window.print()">Imprimir Recibo</button>
  </div>

  <div class="receipt">
    <!-- Header -->
    <div class="header">
      <div class="header-top">
        <div class="header-brand">
          <h1>RECIBO DE ASIGNACION DE TARJETA</h1>
          <p>Sistema de Control de Accesos &mdash; Video Accesos</p>
        </div>
        <div class="header-id">
          <div class="folio-label">No. Asignacion</div>
          <div class="folio-num">#${row.asignacion_id}</div>
        </div>
      </div>
      <div class="header-badges">
        <span class="hbadge hbadge-folio">Folio ${row.folio_tipo} &mdash; ${folioTipoLabel}</span>
        <span class="hbadge ${Number(row.estatus_id) === 1 ? "hbadge-activa" : "hbadge-cancelada"}">
          <span class="hbadge-dot"></span> ${estatusLabel}
        </span>
      </div>
    </div>

    <!-- Body -->
    <div class="body">
      <!-- Info cards -->
      <div class="info-grid">
        <!-- Datos de asignacion -->
        <div class="info-card">
          <div class="info-card-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            Datos de Asignacion
          </div>
          <div class="info-row">
            <span class="info-label">Fecha</span>
            <span class="info-value">${fmtDate(row.fecha)}</span>
          </div>
          ${row.folio_tipo === "H" ? `
          <div class="info-row">
            <span class="info-label">Vencimiento</span>
            <span class="info-value highlight">${fmtDate(row.fecha_vencimiento)}</span>
          </div>` : ""}
          ${row.folio_contrato ? `
          <div class="info-row">
            <span class="info-label">Folio Contrato</span>
            <span class="info-value">${row.folio_contrato}</span>
          </div>` : ""}
          ${row.lectura_epc && String(row.lectura_epc).trim() ? `
          <div class="info-row">
            <span class="info-label">Lectura EPC</span>
            <span class="info-value mono">${row.lectura_epc}</span>
          </div>` : ""}
        </div>

        <!-- Residente -->
        <div class="info-card">
          <div class="info-card-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            Residente
          </div>
          <div class="info-row">
            <span class="info-label">Nombre</span>
            <span class="info-value">${residenteNombre}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Privada</span>
            <span class="info-value">${row.priv_descripcion}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Domicilio</span>
            <span class="info-value">#${row.nro_casa}, ${row.calle}</span>
          </div>
          ${compradorNombre ? `
          <div class="info-row">
            <span class="info-label">Comprador</span>
            <span class="info-value">${compradorNombre}</span>
          </div>` : ""}
        </div>
      </div>

      <!-- Tarjetas -->
      <table class="card-table">
        <thead>
          <tr>
            <th style="width:40px;">#</th>
            <th>Lectura / No. Tarjeta</th>
            <th class="td-center">Tipo</th>
            <th class="td-center" style="width:80px;">Seguro</th>
          </tr>
        </thead>
        <tbody>
          ${tarjetaRows || '<tr><td colspan="4" class="td-center" style="padding:16px;color:#94a3b8;">Sin tarjetas</td></tr>'}
        </tbody>
      </table>

      <!-- Payment -->
      <div class="payment-section">
        <div class="payment-title">Detalle de Pago</div>
        <div class="payment-rows">
          <div class="payment-row">
            <span class="label">Subtotal (${tarjetaSlots.length} tarjeta${tarjetaSlots.length > 1 ? "s" : ""})</span>
            <span class="value">${fmtMoney(precio)}</span>
          </div>
          ${descuento > 0 ? `
          <div class="payment-row discount">
            <span class="label">Descuento</span>
            <span class="value">-${fmtMoney(descuento)}</span>
          </div>` : ""}
          ${iva > 0 ? `
          <div class="payment-row">
            <span class="label">IVA</span>
            <span class="value">${fmtMoney(iva)}</span>
          </div>` : ""}
        </div>
        <hr class="payment-divider" />
        <div class="payment-total">
          <span class="label">TOTAL</span>
          <span class="value">${fmtMoney(total)}</span>
        </div>
        <div class="payment-method">
          <span class="label">Forma de pago</span>
          <span class="value">${tipoPagoLabel}</span>
        </div>
      </div>

      <!-- Concepto / Observaciones -->
      ${row.concepto || (row.observaciones && String(row.observaciones).trim()) ? `
      <div class="notes">
        ${row.concepto ? `<div class="notes-title">Concepto</div><p style="margin-bottom:${row.observaciones && String(row.observaciones).trim() ? "10px" : "0"}">${row.concepto}</p>` : ""}
        ${row.observaciones && String(row.observaciones).trim() ? `<div class="notes-title">Observaciones</div><p>${row.observaciones}</p>` : ""}
      </div>` : ""}

      <!-- Signatures -->
      <div class="signatures">
        <div class="sig-block">
          <div class="sig-line"></div>
          <div class="sig-label">Firma del Residente</div>
        </div>
        <div class="sig-block">
          <div class="sig-line"></div>
          <div class="sig-label">Firma del Operador</div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      Documento generado el ${fechaGeneracion} &bull; Sistema de Control de Accesos &bull; Video Accesos v2.0
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
