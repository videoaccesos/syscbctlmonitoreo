import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/procesos/asignacion-tarjetas/reporte-vencimientos
// ?fechaIni=YYYY-MM-DD&fechaFin=YYYY-MM-DD&format=json|excel
// Reporte de tarjetas que vencen en un periodo (solo Folio H tiene fecha_vencimiento)
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

    // Solo Folio H tiene fecha_vencimiento.
    // Excluir tarjetas que ya fueron renovadas: existe otra asignación
    // más reciente para la misma tarjeta (en cualquiera de las dos tablas).
    const sql = `
      SELECT
        a.asignacion_id,
        CAST(NULLIF(a.fecha, '0000-00-00') AS CHAR) AS fecha_asignacion,
        a.folio_contrato,
        CAST(NULLIF(a.fecha_vencimiento, '0000-00-00') AS CHAR) AS fecha_vencimiento,
        t.lectura, a.lectura_epc, a.numero_serie,
        t.tipo_id,
        (CASE t.tipo_id WHEN 2 THEN 'VEHICULAR' WHEN 1 THEN 'PEATONAL' END) AS tipo,
        a.precio, a.descuento,
        (a.precio - a.descuento) AS neto,
        CONCAT_WS(' ', r.nombre, r.ape_paterno, r.ape_materno) AS residente,
        r.celular AS telefono,
        p.descripcion AS privada, res.nro_casa, res.calle,
        a.estatus_id,
        (CASE a.estatus_id WHEN 1 THEN 'ACTIVA' WHEN 2 THEN 'CANCELADA' END) AS estatus,
        DATEDIFF(a.fecha_vencimiento, CURDATE()) AS dias_restantes
      FROM residencias_residentes_tarjetas a
      INNER JOIN tarjetas t ON a.tarjeta_id = t.tarjeta_id
      INNER JOIN residencias_residentes r ON a.residente_id = r.residente_id
      INNER JOIN residencias res ON r.residencia_id = res.residencia_id
      INNER JOIN privadas p ON res.privada_id = p.privada_id
      WHERE a.estatus_id = 1
        AND a.fecha_vencimiento >= ?
        AND a.fecha_vencimiento <= ?
        AND a.fecha_vencimiento != '0000-00-00'
        -- Excluir si ya se renovó en Folio H (misma tarjeta, asignación posterior)
        AND NOT EXISTS (
          SELECT 1 FROM residencias_residentes_tarjetas r2
          WHERE r2.tarjeta_id = a.tarjeta_id
            AND r2.asignacion_id != a.asignacion_id
            AND r2.estatus_id = 1
            AND r2.fecha > a.fecha_vencimiento
        )
        -- Excluir si ya se renovó en Folio B (misma tarjeta, asignación posterior)
        AND NOT EXISTS (
          SELECT 1 FROM residencias_residentes_tarjetas_no_renovacion r3
          WHERE r3.tarjeta_id = a.tarjeta_id
            AND r3.estatus_id = 1
            AND r3.fecha > a.fecha_vencimiento
        )
      ORDER BY a.fecha_vencimiento ASC
    `;

    const rows = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      sql, fechaIni, fechaFin
    );

    // Serializar BigInt a Number
    const serialize = (data: Array<Record<string, unknown>>) =>
      data.map((row) => {
        const obj: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(row)) {
          obj[k] = typeof v === "bigint" ? Number(v) : v;
        }
        return obj;
      });

    // Separar en vencidas y por vencer
    const hoy = new Date().toISOString().slice(0, 10);
    const serialized = serialize(rows);
    const vencidas = serialized.filter((r) => String(r.fecha_vencimiento) < hoy);
    const porVencer = serialized.filter((r) => String(r.fecha_vencimiento) >= hoy);

    // Concentrado por privada
    const concentrado: Record<string, { privada: string; vencidas: number; porVencer: number; total: number }> = {};
    for (const row of serialized) {
      const priv = String(row.privada);
      if (!concentrado[priv]) concentrado[priv] = { privada: priv, vencidas: 0, porVencer: 0, total: 0 };
      concentrado[priv].total++;
      if (String(row.fecha_vencimiento) < hoy) {
        concentrado[priv].vencidas++;
      } else {
        concentrado[priv].porVencer++;
      }
    }

    if (format === "json") {
      return NextResponse.json({
        fechaIni,
        fechaFin,
        vencidas,
        porVencer,
        concentrado: Object.values(concentrado),
        totalRegistros: serialized.length,
      });
    }

    // format=excel
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

    const excelHeaders = [
      "No.", "Folio Contrato", "Fecha Asignación", "Vencimiento", "Días Rest.",
      "Privada", "Casa", "Residente", "Teléfono", "Tipo", "Lectura",
      "No. Serie", "Lectura EPC", "Estatus"
    ];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const addSheet = (name: string, title: string, data: Array<Record<string, unknown>>) => {
      const ws = workbook.addWorksheet(name);
      ws.mergeCells("A1:N1");
      const tc = ws.getCell("A1");
      tc.value = `${title} - Del ${fechaIni} al ${fechaFin}`;
      tc.font = { bold: true, size: 14, color: { argb: "FF1E40AF" } };
      tc.alignment = { horizontal: "center" };
      ws.addRow([]);
      const hRow = ws.addRow(excelHeaders);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      hRow.eachCell((c: any) => { c.style = headerStyle; });

      for (const row of data) {
        const dr = ws.addRow([
          row.asignacion_id || "", row.folio_contrato || "",
          row.fecha_asignacion || "", row.fecha_vencimiento || "",
          row.dias_restantes ?? "", row.privada || "",
          row.nro_casa || "", row.residente || "", row.telefono || "",
          row.tipo || "", row.lectura || "",
          row.numero_serie || "", row.lectura_epc || "",
          row.estatus || ""
        ]);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        dr.eachCell((c: any) => { c.border = cellBorder; });
        // Colorear días restantes
        const dias = Number(row.dias_restantes);
        if (dias < 0) {
          dr.getCell(5).font = { bold: true, color: { argb: "FFDC2626" } };
        } else if (dias <= 30) {
          dr.getCell(5).font = { bold: true, color: { argb: "FFF59E0B" } };
        }
      }

      ws.addRow([]);
      const totalRow = ws.addRow([`Total: ${data.length} tarjeta(s)`]);
      totalRow.getCell(1).font = { bold: true, size: 12 };

      ws.columns = [
        { width: 8 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 10 },
        { width: 20 }, { width: 8 }, { width: 30 }, { width: 14 }, { width: 12 },
        { width: 18 }, { width: 10 }, { width: 18 }, { width: 12 }
      ];
      return ws;
    };

    addSheet("Vencidas", "TARJETAS VENCIDAS", vencidas);
    addSheet("Por Vencer", "TARJETAS POR VENCER", porVencer);

    // Hoja concentrado
    const ws3 = workbook.addWorksheet("Concentrado");
    ws3.mergeCells("A1:D1");
    const t3 = ws3.getCell("A1");
    t3.value = `CONCENTRADO POR PRIVADA - Del ${fechaIni} al ${fechaFin}`;
    t3.font = { bold: true, size: 14, color: { argb: "FF1E40AF" } };
    t3.alignment = { horizontal: "center" };
    ws3.addRow([]);
    const hRow3 = ws3.addRow(["Privada", "Vencidas", "Por Vencer", "Total"]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    hRow3.eachCell((c: any) => { c.style = headerStyle; });
    let gtVencidas = 0, gtPorVencer = 0, gtTotal = 0;
    for (const c of Object.values(concentrado)) {
      const dr = ws3.addRow([c.privada, c.vencidas, c.porVencer, c.total]);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      dr.eachCell((cell: any) => { cell.border = cellBorder; });
      gtVencidas += c.vencidas;
      gtPorVencer += c.porVencer;
      gtTotal += c.total;
    }
    const gr = ws3.addRow(["TOTAL", gtVencidas, gtPorVencer, gtTotal]);
    gr.getCell(1).font = { bold: true, size: 12 };
    gr.getCell(4).font = { bold: true, size: 12 };
    ws3.columns = [{ width: 25 }, { width: 12 }, { width: 12 }, { width: 12 }];

    const buffer = await workbook.xlsx.writeBuffer();
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="Reporte_Vencimientos_${fechaIni}_${fechaFin}.xlsx"`,
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Error al generar reporte de vencimientos:", msg, error);
    return NextResponse.json(
      { error: `Error al generar reporte: ${msg}` },
      { status: 500 }
    );
  }
}
