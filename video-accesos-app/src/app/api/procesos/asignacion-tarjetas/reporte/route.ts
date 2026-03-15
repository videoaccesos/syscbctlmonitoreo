import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/procesos/asignacion-tarjetas/reporte - Reporte de ventas por periodo
// ?fechaIni=YYYY-MM-DD&fechaFin=YYYY-MM-DD&format=json|excel
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const fechaIni = searchParams.get("fechaIni");
    const fechaFin = searchParams.get("fechaFin");
    const format = searchParams.get("format") || "json";

    if (!fechaIni || !fechaFin) {
      return NextResponse.json(
        { error: "Campos requeridos: fechaIni, fechaFin" },
        { status: 400 }
      );
    }

    // Columnas comunes (sin fecha_vencimiento que solo existe en tabla H)
    const commonCols = `asignacion_id, privada, tarjeta_id, tarjeta_id2, tarjeta_id3,
             tarjeta_id4, tarjeta_id5, numero_serie, numero_serie2, numero_serie3,
             numero_serie4, numero_serie5, residente_id, comprador_id,
             mostrar_nombre_comprador, fecha, lectura_tipo_id, lectura_epc,
             folio_contrato, precio, descuento, IVA, utilizo_seguro, utilizo_seguro2,
             utilizo_seguro3, utilizo_seguro4, utilizo_seguro5, concepto,
             interfon_extra, estatus_id, fecha_modificacion, tipo_pago,
             usuario_id, observaciones`;

    const buildUnion = (whereH: string, whereB: string) => `
      SELECT ${commonCols}, 'H' AS folio_tipo FROM residencias_residentes_tarjetas WHERE ${whereH}
      UNION ALL
      SELECT ${commonCols}, 'B' AS folio_tipo FROM residencias_residentes_tarjetas_no_renovacion WHERE ${whereB}
    `;

    const joinsSql = `
      INNER JOIN tarjetas t ON a.tarjeta_id = t.tarjeta_id
      INNER JOIN residencias_residentes r ON a.residente_id = r.residente_id
      INNER JOIN residencias res ON r.residencia_id = res.residencia_id
      INNER JOIN privadas p ON res.privada_id = p.privada_id
    `;

    const outerCols = `CAST(NULLIF(a.fecha, '0000-00-00') AS CHAR) AS fecha,
             a.folio_contrato, t.lectura, a.lectura_epc, t.tipo_id,
             (CASE t.tipo_id WHEN 2 THEN 'VEHICULAR' WHEN 1 THEN 'PEATONAL' END) AS tipo,
             a.precio, a.descuento, a.IVA,
             CONCAT_WS(' ', r.nombre, r.ape_paterno, r.ape_materno) AS residente,
             p.descripcion AS privada, res.nro_casa, res.calle,
             a.folio_tipo`;

    const sqlVendidas = `
      SELECT ${outerCols}
      FROM (${buildUnion(
        "fecha >= ? AND fecha <= ? AND estatus_id = 1 AND utilizo_seguro = 0",
        "fecha >= ? AND fecha <= ? AND estatus_id = 1 AND utilizo_seguro = 0"
      )}) a ${joinsSql} ORDER BY a.fecha
    `;

    const sqlSeguro = `
      SELECT ${outerCols}
      FROM (${buildUnion(
        "fecha >= ? AND fecha <= ? AND estatus_id = 1 AND utilizo_seguro = 1",
        "fecha >= ? AND fecha <= ? AND estatus_id = 1 AND utilizo_seguro = 1"
      )}) a ${joinsSql} ORDER BY a.fecha
    `;

    const sqlCanceladas = `
      SELECT ${outerCols}
      FROM (${buildUnion(
        "fecha >= ? AND fecha <= ? AND estatus_id = 2",
        "fecha >= ? AND fecha <= ? AND estatus_id = 2"
      )}) a ${joinsSql} ORDER BY a.fecha
    `;

    const sqlConcentrado = `
      SELECT p.descripcion AS privada, t.tipo_id,
             COUNT(*) AS numTarjetas, SUM(a.precio) AS dblTotal
      FROM (${buildUnion(
        "fecha >= ? AND fecha <= ? AND estatus_id = 1",
        "fecha >= ? AND fecha <= ? AND estatus_id = 1"
      )}) a ${joinsSql}
      GROUP BY p.descripcion, t.tipo_id
      ORDER BY p.descripcion
    `;

    const [vendidas, seguro, canceladas, concentrado] = await Promise.all([
      prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
        sqlVendidas, fechaIni, fechaFin, fechaIni, fechaFin
      ),
      prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
        sqlSeguro, fechaIni, fechaFin, fechaIni, fechaFin
      ),
      prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
        sqlCanceladas, fechaIni, fechaFin, fechaIni, fechaFin
      ),
      prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
        sqlConcentrado, fechaIni, fechaFin, fechaIni, fechaFin
      ),
    ]);

    // Serializar BigInt a Number
    const serialize = (rows: Array<Record<string, unknown>>) =>
      rows.map((row) => {
        const obj: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(row)) {
          obj[k] = typeof v === "bigint" ? Number(v) : v;
        }
        return obj;
      });

    if (format === "json") {
      return NextResponse.json({
        fechaIni,
        fechaFin,
        vendidas: serialize(vendidas),
        seguro: serialize(seguro),
        canceladas: serialize(canceladas),
        concentrado: serialize(concentrado),
      });
    }

    // format=excel — generar Excel con ExcelJS (importacion dinamica)
    const ExcelJSMod = await import("exceljs");
    const ExcelJSLib = ExcelJSMod.default || ExcelJSMod;
    const workbook = new ExcelJSLib.Workbook();
    workbook.creator = "Sistema Control de Accesos";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const headerStyle: any = {
      font: { bold: true, color: { argb: "FFFFFFFF" }, size: 11 },
      fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FF2563EB" } },
      alignment: { horizontal: "center", vertical: "middle" },
      border: { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cellBorder: any = {
      top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" },
    };

    // Hoja 1: Vendidas
    const ws1 = workbook.addWorksheet("Tarjetas Vendidas");
    ws1.mergeCells("A1:K1");
    const t1 = ws1.getCell("A1");
    t1.value = `REPORTE DE TARJETAS VENDIDAS - Del ${fechaIni} al ${fechaFin}`;
    t1.font = { bold: true, size: 14, color: { argb: "FF1E40AF" } };
    t1.alignment = { horizontal: "center" };
    ws1.addRow([]);
    const h1 = ws1.addRow(["Fecha","Folio","Lectura","Tipo","Precio","Descuento","IVA","Residente","Privada","Direccion","Folio Tipo"]);
    h1.eachCell((c) => { c.style = headerStyle; });

    let totalV = 0, totalP = 0, numV = 0, numP = 0;
    for (const row of vendidas) {
      const p = Number(row.precio) || 0;
      const d = Number(row.descuento) || 0;
      const iv = Number(row.IVA) || 0;
      const dr = ws1.addRow([row.fecha||"",row.folio_contrato||"",row.lectura||"",row.tipo||"",p,d,iv,row.residente||"",row.privada||"",`${row.nro_casa}, ${row.calle}`,row.folio_tipo||""]);
      dr.eachCell((c) => { c.border = cellBorder; });
      dr.getCell(5).numFmt = "$#,##0.00";
      dr.getCell(6).numFmt = "$#,##0.00";
      dr.getCell(7).numFmt = "$#,##0.00";
      if (Number(row.tipo_id) === 1) { numP++; totalP += p; } else { numV++; totalV += p; }
    }
    ws1.addRow([]);
    ws1.addRow(["","","","TOTAL GENERAL"]).getCell(4).font = { bold: true };
    const rP = ws1.addRow(["","","",`${numP} PEATONAL`,totalP]); rP.getCell(5).numFmt = "$#,##0.00"; rP.getCell(4).font = { bold: true };
    const rV = ws1.addRow(["","","",`${numV} VEHICULAR`,totalV]); rV.getCell(5).numFmt = "$#,##0.00"; rV.getCell(4).font = { bold: true };
    const rT = ws1.addRow(["","","",`${numP+numV} TOTAL`,totalP+totalV]); rT.getCell(5).numFmt = "$#,##0.00"; rT.getCell(4).font = { bold: true, size: 12 }; rT.getCell(5).font = { bold: true, size: 12 };
    ws1.columns = [{width:12},{width:12},{width:18},{width:12},{width:12},{width:12},{width:12},{width:30},{width:20},{width:25},{width:10}];

    // Hoja 2: Seguro
    const ws2 = workbook.addWorksheet("Por Seguro");
    ws2.mergeCells("A1:H1");
    const t2 = ws2.getCell("A1");
    t2.value = `TARJETAS POR SEGURO UTILIZADO - Del ${fechaIni} al ${fechaFin}`;
    t2.font = { bold: true, size: 14, color: { argb: "FF1E40AF" } };
    t2.alignment = { horizontal: "center" };
    ws2.addRow([]);
    const headers2 = ["Fecha","Folio","Lectura","Tipo","Precio","Residente","Privada","Direccion"];
    ws2.addRow(headers2).eachCell((c) => { c.style = headerStyle; });
    for (const row of seguro) {
      const dr = ws2.addRow([row.fecha||"",row.folio_contrato||"",row.lectura||"",row.tipo||"",Number(row.precio)||0,row.residente||"",row.privada||"",`${row.nro_casa}, ${row.calle}`]);
      dr.eachCell((c) => { c.border = cellBorder; });
      dr.getCell(5).numFmt = "$#,##0.00";
    }
    ws2.addRow([]); ws2.addRow(["","","",`Total: ${seguro.length} tarjetas`]);
    ws2.columns = [{width:12},{width:12},{width:18},{width:12},{width:12},{width:30},{width:20},{width:25}];

    // Hoja 3: Canceladas
    const ws3 = workbook.addWorksheet("Canceladas");
    ws3.mergeCells("A1:H1");
    const t3 = ws3.getCell("A1");
    t3.value = `TARJETAS CANCELADAS - Del ${fechaIni} al ${fechaFin}`;
    t3.font = { bold: true, size: 14, color: { argb: "FF1E40AF" } };
    t3.alignment = { horizontal: "center" };
    ws3.addRow([]);
    ws3.addRow(headers2).eachCell((c) => { c.style = headerStyle; });
    for (const row of canceladas) {
      const dr = ws3.addRow([row.fecha||"",row.folio_contrato||"",row.lectura||"",row.tipo||"",Number(row.precio)||0,row.residente||"",row.privada||"",`${row.nro_casa}, ${row.calle}`]);
      dr.eachCell((c) => { c.border = cellBorder; });
      dr.getCell(5).numFmt = "$#,##0.00";
    }
    ws3.addRow([]); ws3.addRow(["","","",`Total: ${canceladas.length} tarjetas`]);
    ws3.columns = [{width:12},{width:12},{width:18},{width:12},{width:12},{width:30},{width:20},{width:25}];

    // Hoja 4: Concentrado
    const ws4 = workbook.addWorksheet("Concentrado");
    ws4.mergeCells("A1:F1");
    const t4 = ws4.getCell("A1");
    t4.value = `CONCENTRADO POR PRIVADA - Del ${fechaIni} al ${fechaFin}`;
    t4.font = { bold: true, size: 14, color: { argb: "FF1E40AF" } };
    t4.alignment = { horizontal: "center" };
    ws4.addRow([]);
    ws4.addRow(["Privada","Peatonales","Total Peatonal","Vehiculares","Total Vehicular","Total General"]).eachCell((c) => { c.style = headerStyle; });

    const porPrivada: Record<string,{peatonales:number;totalPeatonal:number;vehiculares:number;totalVehicular:number}> = {};
    for (const row of concentrado) {
      const priv = String(row.privada);
      if (!porPrivada[priv]) porPrivada[priv] = { peatonales: 0, totalPeatonal: 0, vehiculares: 0, totalVehicular: 0 };
      if (Number(row.tipo_id) === 1) {
        porPrivada[priv].peatonales = Number(row.numTarjetas) || 0;
        porPrivada[priv].totalPeatonal = Number(row.dblTotal) || 0;
      } else {
        porPrivada[priv].vehiculares = Number(row.numTarjetas) || 0;
        porPrivada[priv].totalVehicular = Number(row.dblTotal) || 0;
      }
    }
    let grandTotal = 0;
    for (const [priv, d] of Object.entries(porPrivada)) {
      const tg = d.totalPeatonal + d.totalVehicular;
      grandTotal += tg;
      const dr = ws4.addRow([priv, d.peatonales, d.totalPeatonal, d.vehiculares, d.totalVehicular, tg]);
      dr.eachCell((c) => { c.border = cellBorder; });
      dr.getCell(3).numFmt = "$#,##0.00"; dr.getCell(5).numFmt = "$#,##0.00"; dr.getCell(6).numFmt = "$#,##0.00";
    }
    ws4.addRow([]);
    const gr = ws4.addRow(["GRAN TOTAL","","","","",grandTotal]);
    gr.getCell(1).font = { bold: true, size: 12 }; gr.getCell(6).font = { bold: true, size: 12 }; gr.getCell(6).numFmt = "$#,##0.00";
    ws4.columns = [{width:25},{width:12},{width:16},{width:12},{width:16},{width:16}];

    const buffer = await workbook.xlsx.writeBuffer();
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="Reporte_Asignacion_Tarjetas_${fechaIni}_${fechaFin}.xlsx"`,
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Error al generar reporte:", msg, error);
    return NextResponse.json(
      { error: `Error al generar reporte: ${msg}` },
      { status: 500 }
    );
  }
}
