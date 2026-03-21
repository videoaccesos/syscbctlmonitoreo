import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/catalogos/tarjetas/reporte
// ?search=&estatusId=&tipoId=&format=json|excel
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const estatusId = searchParams.get("estatusId") || "";
    const tipoId = searchParams.get("tipoId") || "";
    const format = searchParams.get("format") || "json";

    // Query: tarjetas con su info de asignacion (si tiene)
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (search) {
      conditions.push("(t.lectura LIKE ? OR t.numero_serie LIKE ?)");
      params.push(`%${search}%`, `%${search}%`);
    }
    if (estatusId) {
      conditions.push("t.estatus_id = ?");
      params.push(parseInt(estatusId, 10));
    }
    if (tipoId) {
      conditions.push("t.tipo_id = ?");
      params.push(parseInt(tipoId, 10));
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Subquery para obtener la asignacion activa mas reciente de cada tarjeta
    // Busca en ambas tablas (Folio H y Folio B)
    const sql = `
      SELECT
        t.tarjeta_id,
        t.lectura,
        t.numero_serie,
        t.tipo_id,
        (CASE t.tipo_id WHEN 2 THEN 'VEHICULAR' WHEN 1 THEN 'PEATONAL' END) AS tipo,
        t.estatus_id,
        (CASE t.estatus_id
          WHEN 1 THEN 'ACTIVA'
          WHEN 2 THEN 'ASIGNADA'
          WHEN 3 THEN 'DANADA'
          WHEN 4 THEN 'CONSIGNACION'
          WHEN 5 THEN 'BAJA'
        END) AS estatus,
        t.observaciones,
        CAST(NULLIF(t.fecha, '0000-00-00') AS CHAR) AS fecha_registro,
        CAST(NULLIF(t.fecha_modificacion, '0000-00-00 00:00:00') AS CHAR) AS fecha_modificacion,
        asig.folio_contrato,
        asig.privada,
        asig.calle,
        asig.nro_casa,
        asig.residente,
        asig.telefono_interfon,
        asig.asig_estatus,
        CAST(NULLIF(asig.fecha_vencimiento, '0000-00-00') AS CHAR) AS fecha_vencimiento
      FROM tarjetas t
      LEFT JOIN (
        SELECT sub.* FROM (
          SELECT
            a.tarjeta_id AS tid,
            a.folio_contrato,
            p.descripcion AS privada,
            res.calle,
            res.nro_casa,
            CONCAT_WS(' ', r.nombre, r.ape_paterno, r.ape_materno) AS residente,
            res.telefono_interfon,
            (CASE a.estatus_id WHEN 1 THEN 'ACTIVA' WHEN 2 THEN 'CANCELADA' END) AS asig_estatus,
            a.fecha_vencimiento,
            a.fecha AS fecha_asig,
            'H' AS folio_tipo
          FROM residencias_residentes_tarjetas a
          INNER JOIN residencias_residentes r ON a.residente_id = r.residente_id
          INNER JOIN residencias res ON r.residencia_id = res.residencia_id
          INNER JOIN privadas p ON res.privada_id = p.privada_id
          WHERE a.estatus_id = 1

          UNION ALL

          SELECT
            b.tarjeta_id AS tid,
            b.folio_contrato,
            p.descripcion AS privada,
            res.calle,
            res.nro_casa,
            CONCAT_WS(' ', r.nombre, r.ape_paterno, r.ape_materno) AS residente,
            res.telefono_interfon,
            (CASE b.estatus_id WHEN 1 THEN 'ACTIVA' WHEN 2 THEN 'CANCELADA' END) AS asig_estatus,
            b.fecha_vencimiento,
            b.fecha AS fecha_asig,
            'B' AS folio_tipo
          FROM residencias_residentes_tarjetas_no_renovacion b
          INNER JOIN residencias_residentes r ON b.residente_id = r.residente_id
          INNER JOIN residencias res ON r.residencia_id = res.residencia_id
          INNER JOIN privadas p ON res.privada_id = p.privada_id
          WHERE b.estatus_id = 1
        ) sub
      ) asig ON asig.tid = t.tarjeta_id
      ${whereClause}
      ORDER BY t.lectura ASC
    `;

    const rows = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(sql, ...params);

    // Serializar BigInt
    const serialize = (data: Array<Record<string, unknown>>) =>
      data.map((row) => {
        const obj: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(row)) {
          obj[k] = typeof v === "bigint" ? Number(v) : v;
        }
        return obj;
      });

    const serialized = serialize(rows);

    // Conteos por estatus
    const conteos: Record<string, number> = {};
    for (const row of serialized) {
      const est = String(row.estatus);
      conteos[est] = (conteos[est] || 0) + 1;
    }

    if (format === "json") {
      return NextResponse.json({
        data: serialized,
        total: serialized.length,
        conteos,
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

    const ws = workbook.addWorksheet("Catalogo Tarjetas");

    const excelHeaders = [
      "No.", "Lectura", "No. Serie", "Tipo", "Estatus Tarjeta",
      "Folio Contrato", "Privada", "Calle", "Casa", "Residente",
      "Tel. Interfon", "Estatus Asignacion", "Vencimiento",
      "Observaciones", "Fecha Registro"
    ];

    ws.mergeCells("A1:O1");
    const tc = ws.getCell("A1");
    tc.value = "CATALOGO DE TARJETAS";
    tc.font = { bold: true, size: 14, color: { argb: "FF1E40AF" } };
    tc.alignment = { horizontal: "center" };
    ws.addRow([]);
    const hRow = ws.addRow(excelHeaders);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    hRow.eachCell((c: any) => { c.style = headerStyle; });

    const estatusColors: Record<string, string> = {
      ACTIVA: "FF16A34A",
      ASIGNADA: "FF2563EB",
      DANADA: "FFDC2626",
      CONSIGNACION: "FFD97706",
      BAJA: "FF6B7280",
    };

    for (const [i, row] of serialized.entries()) {
      const dr = ws.addRow([
        i + 1,
        row.lectura || "",
        row.numero_serie || "",
        row.tipo || "",
        row.estatus || "",
        row.folio_contrato || "",
        row.privada || "",
        row.calle || "",
        row.nro_casa || "",
        row.residente || "",
        row.telefono_interfon || "",
        row.asig_estatus || "",
        row.fecha_vencimiento || "",
        row.observaciones || "",
        row.fecha_registro || "",
      ]);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      dr.eachCell((c: any) => { c.border = cellBorder; });
      const color = estatusColors[String(row.estatus)] || "";
      if (color) {
        dr.getCell(5).font = { bold: true, color: { argb: color } };
      }
    }

    ws.addRow([]);
    const totalRow = ws.addRow([`Total: ${serialized.length} tarjeta(s)`]);
    totalRow.getCell(1).font = { bold: true, size: 12 };

    ws.columns = [
      { width: 8 }, { width: 20 }, { width: 14 }, { width: 12 }, { width: 16 },
      { width: 16 }, { width: 20 }, { width: 20 }, { width: 8 }, { width: 30 },
      { width: 14 }, { width: 16 }, { width: 14 }, { width: 25 }, { width: 14 }
    ];

    const buffer = await workbook.xlsx.writeBuffer();
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="Catalogo_Tarjetas.xlsx"`,
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Error al generar reporte de catalogo de tarjetas:", msg, error);
    return NextResponse.json(
      { error: `Error al generar reporte: ${msg}` },
      { status: 500 }
    );
  }
}
