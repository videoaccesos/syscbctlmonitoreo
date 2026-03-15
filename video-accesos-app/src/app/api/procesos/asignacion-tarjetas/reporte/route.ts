import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ExcelJS from "exceljs";

// GET /api/procesos/asignacion-tarjetas/reporte - Generar reporte Excel de ventas por periodo
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const fechaIni = searchParams.get("fechaIni");
    const fechaFin = searchParams.get("fechaFin");

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

    // Funcion helper para construir UNION ALL con columnas explicitas
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

    // Query: Tarjetas vendidas (activas, sin seguro)
    const sqlVendidas = `
      SELECT ${outerCols}
      FROM (${buildUnion(
        "fecha >= ? AND fecha <= ? AND estatus_id = 1 AND utilizo_seguro = 0",
        "fecha >= ? AND fecha <= ? AND estatus_id = 1 AND utilizo_seguro = 0"
      )}) a ${joinsSql} ORDER BY a.fecha
    `;

    // Query: Tarjetas por seguro (activas, con seguro)
    const sqlSeguro = `
      SELECT ${outerCols}
      FROM (${buildUnion(
        "fecha >= ? AND fecha <= ? AND estatus_id = 1 AND utilizo_seguro = 1",
        "fecha >= ? AND fecha <= ? AND estatus_id = 1 AND utilizo_seguro = 1"
      )}) a ${joinsSql} ORDER BY a.fecha
    `;

    // Query: Tarjetas canceladas
    const sqlCanceladas = `
      SELECT ${outerCols}
      FROM (${buildUnion(
        "fecha >= ? AND fecha <= ? AND estatus_id = 2",
        "fecha >= ? AND fecha <= ? AND estatus_id = 2"
      )}) a ${joinsSql} ORDER BY a.fecha
    `;

    // Query: Concentrado por privada
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
        sqlVendidas,
        fechaIni,
        fechaFin,
        fechaIni,
        fechaFin
      ),
      prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
        sqlSeguro,
        fechaIni,
        fechaFin,
        fechaIni,
        fechaFin
      ),
      prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
        sqlCanceladas,
        fechaIni,
        fechaFin,
        fechaIni,
        fechaFin
      ),
      prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
        sqlConcentrado,
        fechaIni,
        fechaFin,
        fechaIni,
        fechaFin
      ),
    ]);

    // Crear Excel
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Sistema Control de Accesos";

    const headerStyle: Partial<ExcelJS.Style> = {
      font: { bold: true, color: { argb: "FFFFFFFF" }, size: 11 },
      fill: {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF2563EB" },
      },
      alignment: { horizontal: "center", vertical: "middle" },
      border: {
        top: { style: "thin" },
        bottom: { style: "thin" },
        left: { style: "thin" },
        right: { style: "thin" },
      },
    };

    const cellBorder: Partial<ExcelJS.Borders> = {
      top: { style: "thin" },
      bottom: { style: "thin" },
      left: { style: "thin" },
      right: { style: "thin" },
    };

    // ====== Hoja 1: Tarjetas Vendidas ======
    const ws1 = workbook.addWorksheet("Tarjetas Vendidas");
    ws1.mergeCells("A1:I1");
    const titleCell1 = ws1.getCell("A1");
    titleCell1.value = `REPORTE DE TARJETAS VENDIDAS - Del ${fechaIni} al ${fechaFin}`;
    titleCell1.font = { bold: true, size: 14, color: { argb: "FF1E40AF" } };
    titleCell1.alignment = { horizontal: "center" };

    ws1.addRow([]);
    const headers1 = [
      "Fecha",
      "Folio",
      "Lectura",
      "Tipo",
      "Precio",
      "Descuento",
      "IVA",
      "Residente",
      "Privada",
      "Direccion",
      "Folio Tipo",
    ];
    const headerRow1 = ws1.addRow(headers1);
    headerRow1.eachCell((cell) => {
      cell.style = headerStyle;
    });

    let totalVehicular = 0;
    let totalPeatonal = 0;
    let numVehicular = 0;
    let numPeatonal = 0;

    for (const row of vendidas) {
      const precio = Number(row.precio) || 0;
      const descuento = Number(row.descuento) || 0;
      const iva = Number(row.IVA) || 0;
      const dataRow = ws1.addRow([
        row.fecha || "",
        row.folio_contrato || "",
        row.lectura || "",
        row.tipo || "",
        precio,
        descuento,
        iva,
        row.residente || "",
        row.privada || "",
        `${row.nro_casa}, ${row.calle}`,
        row.folio_tipo || "",
      ]);
      dataRow.eachCell((cell) => {
        cell.border = cellBorder;
      });
      dataRow.getCell(5).numFmt = "$#,##0.00";
      dataRow.getCell(6).numFmt = "$#,##0.00";
      dataRow.getCell(7).numFmt = "$#,##0.00";

      if (Number(row.tipo_id) === 1) {
        numPeatonal++;
        totalPeatonal += precio;
      } else {
        numVehicular++;
        totalVehicular += precio;
      }
    }

    ws1.addRow([]);
    const totRow1 = ws1.addRow(["", "", "", "TOTAL GENERAL"]);
    totRow1.getCell(4).font = { bold: true };
    const totP = ws1.addRow([
      "",
      "",
      "",
      `${numPeatonal} PEATONAL`,
      totalPeatonal,
    ]);
    totP.getCell(5).numFmt = "$#,##0.00";
    totP.getCell(4).font = { bold: true };
    const totV = ws1.addRow([
      "",
      "",
      "",
      `${numVehicular} VEHICULAR`,
      totalVehicular,
    ]);
    totV.getCell(5).numFmt = "$#,##0.00";
    totV.getCell(4).font = { bold: true };
    const totG = ws1.addRow([
      "",
      "",
      "",
      `${numPeatonal + numVehicular} TOTAL`,
      totalPeatonal + totalVehicular,
    ]);
    totG.getCell(5).numFmt = "$#,##0.00";
    totG.getCell(4).font = { bold: true, size: 12 };
    totG.getCell(5).font = { bold: true, size: 12 };

    ws1.columns = [
      { width: 12 },
      { width: 12 },
      { width: 18 },
      { width: 12 },
      { width: 12 },
      { width: 12 },
      { width: 12 },
      { width: 30 },
      { width: 20 },
      { width: 25 },
      { width: 10 },
    ];

    // ====== Hoja 2: Tarjetas por Seguro ======
    const ws2 = workbook.addWorksheet("Por Seguro");
    ws2.mergeCells("A1:H1");
    const titleCell2 = ws2.getCell("A1");
    titleCell2.value = `TARJETAS POR SEGURO UTILIZADO - Del ${fechaIni} al ${fechaFin}`;
    titleCell2.font = { bold: true, size: 14, color: { argb: "FF1E40AF" } };
    titleCell2.alignment = { horizontal: "center" };

    ws2.addRow([]);
    const headers2 = [
      "Fecha",
      "Folio",
      "Lectura",
      "Tipo",
      "Precio",
      "Residente",
      "Privada",
      "Direccion",
    ];
    const headerRow2 = ws2.addRow(headers2);
    headerRow2.eachCell((cell) => {
      cell.style = headerStyle;
    });

    for (const row of seguro) {
      const dataRow = ws2.addRow([
        row.fecha || "",
        row.folio_contrato || "",
        row.lectura || "",
        row.tipo || "",
        Number(row.precio) || 0,
        row.residente || "",
        row.privada || "",
        `${row.nro_casa}, ${row.calle}`,
      ]);
      dataRow.eachCell((cell) => {
        cell.border = cellBorder;
      });
      dataRow.getCell(5).numFmt = "$#,##0.00";
    }

    ws2.addRow([]);
    ws2.addRow(["", "", "", `Total: ${seguro.length} tarjetas`]);

    ws2.columns = [
      { width: 12 },
      { width: 12 },
      { width: 18 },
      { width: 12 },
      { width: 12 },
      { width: 30 },
      { width: 20 },
      { width: 25 },
    ];

    // ====== Hoja 3: Tarjetas Canceladas ======
    const ws3 = workbook.addWorksheet("Canceladas");
    ws3.mergeCells("A1:H1");
    const titleCell3 = ws3.getCell("A1");
    titleCell3.value = `TARJETAS CANCELADAS - Del ${fechaIni} al ${fechaFin}`;
    titleCell3.font = { bold: true, size: 14, color: { argb: "FF1E40AF" } };
    titleCell3.alignment = { horizontal: "center" };

    ws3.addRow([]);
    const headerRow3 = ws3.addRow(headers2);
    headerRow3.eachCell((cell) => {
      cell.style = headerStyle;
    });

    for (const row of canceladas) {
      const dataRow = ws3.addRow([
        row.fecha || "",
        row.folio_contrato || "",
        row.lectura || "",
        row.tipo || "",
        Number(row.precio) || 0,
        row.residente || "",
        row.privada || "",
        `${row.nro_casa}, ${row.calle}`,
      ]);
      dataRow.eachCell((cell) => {
        cell.border = cellBorder;
      });
      dataRow.getCell(5).numFmt = "$#,##0.00";
    }

    ws3.addRow([]);
    ws3.addRow(["", "", "", `Total: ${canceladas.length} tarjetas`]);

    ws3.columns = [
      { width: 12 },
      { width: 12 },
      { width: 18 },
      { width: 12 },
      { width: 12 },
      { width: 30 },
      { width: 20 },
      { width: 25 },
    ];

    // ====== Hoja 4: Concentrado por Privada ======
    const ws4 = workbook.addWorksheet("Concentrado");
    ws4.mergeCells("A1:F1");
    const titleCell4 = ws4.getCell("A1");
    titleCell4.value = `CONCENTRADO POR PRIVADA - Del ${fechaIni} al ${fechaFin}`;
    titleCell4.font = { bold: true, size: 14, color: { argb: "FF1E40AF" } };
    titleCell4.alignment = { horizontal: "center" };

    ws4.addRow([]);
    const headers4 = [
      "Privada",
      "Peatonales",
      "Total Peatonal",
      "Vehiculares",
      "Total Vehicular",
      "Total General",
    ];
    const headerRow4 = ws4.addRow(headers4);
    headerRow4.eachCell((cell) => {
      cell.style = headerStyle;
    });

    // Agrupar datos por privada
    const porPrivada: Record<
      string,
      {
        peatonales: number;
        totalPeatonal: number;
        vehiculares: number;
        totalVehicular: number;
      }
    > = {};

    for (const row of concentrado) {
      const privada = String(row.privada);
      if (!porPrivada[privada]) {
        porPrivada[privada] = {
          peatonales: 0,
          totalPeatonal: 0,
          vehiculares: 0,
          totalVehicular: 0,
        };
      }
      if (Number(row.tipo_id) === 1) {
        porPrivada[privada].peatonales = Number(row.numTarjetas) || 0;
        porPrivada[privada].totalPeatonal = Number(row.dblTotal) || 0;
      } else {
        porPrivada[privada].vehiculares = Number(row.numTarjetas) || 0;
        porPrivada[privada].totalVehicular = Number(row.dblTotal) || 0;
      }
    }

    let grandTotal = 0;
    for (const [privada, datos] of Object.entries(porPrivada)) {
      const totalGen = datos.totalPeatonal + datos.totalVehicular;
      grandTotal += totalGen;
      const dataRow = ws4.addRow([
        privada,
        datos.peatonales,
        datos.totalPeatonal,
        datos.vehiculares,
        datos.totalVehicular,
        totalGen,
      ]);
      dataRow.eachCell((cell) => {
        cell.border = cellBorder;
      });
      dataRow.getCell(3).numFmt = "$#,##0.00";
      dataRow.getCell(5).numFmt = "$#,##0.00";
      dataRow.getCell(6).numFmt = "$#,##0.00";
    }

    ws4.addRow([]);
    const grandRow = ws4.addRow([
      "GRAN TOTAL",
      "",
      "",
      "",
      "",
      grandTotal,
    ]);
    grandRow.getCell(1).font = { bold: true, size: 12 };
    grandRow.getCell(6).font = { bold: true, size: 12 };
    grandRow.getCell(6).numFmt = "$#,##0.00";

    ws4.columns = [
      { width: 25 },
      { width: 12 },
      { width: 16 },
      { width: 12 },
      { width: 16 },
      { width: 16 },
    ];

    // Generar buffer
    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="Reporte_Asignacion_Tarjetas_${fechaIni}_${fechaFin}.xlsx"`,
      },
    });
  } catch (error) {
    console.error("Error al generar reporte:", error);
    return NextResponse.json(
      { error: "Error al generar reporte" },
      { status: 500 }
    );
  }
}
