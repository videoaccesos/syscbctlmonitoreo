import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/catalogos/tarjetas/reporte
// ?search=&estatusId=&tipoId=&page=1&limit=100&format=json|excel
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
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(500, Math.max(1, parseInt(searchParams.get("limit") || "100", 10)));
    const skip = (page - 1) * limit;

    // Excluir estatus_id = 0 (registros invalidos)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {
      estatusId: { not: 0 },
      tipoId: { not: 0 },
    };

    if (search) {
      where.OR = [
        { lectura: { contains: search } },
        { numeroSerie: { contains: search } },
      ];
    }
    if (estatusId) {
      const est = parseInt(estatusId, 10);
      if (!isNaN(est)) where.estatusId = est;
    }
    if (tipoId) {
      const tip = parseInt(tipoId, 10);
      if (!isNaN(tip)) where.tipoId = tip;
    }

    const isExcel = format === "excel";

    // Paso 1: Obtener tarjetas y total
    const findArgs = {
      where,
      orderBy: { lectura: "asc" as const },
      skip: isExcel ? 0 : skip,
      take: isExcel ? 10000 : limit,
    };
    const tarjetas = await prisma.tarjeta.findMany(findArgs);

    const total = await prisma.tarjeta.count({ where });

    if (tarjetas.length === 0 && !isExcel) {
      return NextResponse.json({ data: [], total: 0, page, limit, totalPages: 0, conteos: {} });
    }

    // Paso 2: Conteos por estatus usando Prisma groupBy
    const conteosRaw = await prisma.tarjeta.groupBy({
      by: ["estatusId"],
      where,
      _count: { estatusId: true },
    });

    const ESTATUS_LABELS: Record<number, string> = {
      1: "ACTIVA", 2: "ASIGNADA", 3: "DANADA", 4: "CONSIGNACION", 5: "BAJA",
    };
    const TIPO_LABELS: Record<number, string> = { 1: "PEATONAL", 2: "VEHICULAR" };

    const conteos: Record<string, number> = {};
    for (const r of conteosRaw) {
      const label = ESTATUS_LABELS[r.estatusId] || `ESTATUS ${r.estatusId}`;
      conteos[label] = r._count.estatusId;
    }

    // Paso 3: Buscar asignaciones activas para las tarjetas de esta pagina
    const tarjetaIds = tarjetas.map((t) => String(t.id));
    const asignacionMap: Record<string, {
      folio_contrato: string;
      privada: string;
      calle: string;
      nro_casa: string;
      residente: string;
      telefono_interfon: string;
      asig_estatus: string;
      fecha_vencimiento: string;
    }> = {};

    if (tarjetaIds.length > 0) {
      const ph = tarjetaIds.map(() => "?").join(",");
      const slots = ["tarjeta_id", "tarjeta_id2", "tarjeta_id3", "tarjeta_id4", "tarjeta_id5"];

      const unions: string[] = [];
      for (const table of [
        "residencias_residentes_tarjetas",
        "residencias_residentes_tarjetas_no_renovacion",
      ]) {
        for (const slot of slots) {
          unions.push(
            `SELECT a.${slot} AS tid, a.folio_contrato,
                    a.estatus_id AS asig_est,
                    CAST(NULLIF(a.fecha_vencimiento, '0000-00-00') AS CHAR) AS fv,
                    a.residente_id
             FROM ${table} a
             WHERE a.estatus_id = 1
               AND a.${slot} IN (${ph})
               AND a.${slot} != ''`
          );
        }
      }

      const allParams = Array(10).fill(tarjetaIds).flat();

      const asigRows = await prisma.$queryRawUnsafe<
        Array<{
          tid: string;
          folio_contrato: string;
          asig_est: number;
          fv: string | null;
          privada: string;
          calle: string;
          nro_casa: string;
          residente: string;
          telefono_interfon: string | null;
        }>
      >(
        `SELECT sub.tid, sub.folio_contrato, sub.asig_est, sub.fv,
                p.descripcion AS privada,
                res.calle, res.nro_casa,
                CONCAT_WS(' ', r.nombre, r.ape_paterno, r.ape_materno) AS residente,
                res.telefono_interfon
         FROM (${unions.join("\nUNION ALL\n")}) sub
         INNER JOIN residencias_residentes r ON sub.residente_id = r.residente_id
         INNER JOIN residencias res ON r.residencia_id = res.residencia_id
         INNER JOIN privadas p ON res.privada_id = p.privada_id`,
        ...allParams
      );

      for (const row of asigRows) {
        if (!asignacionMap[row.tid]) {
          asignacionMap[row.tid] = {
            folio_contrato: row.folio_contrato || "",
            privada: row.privada || "",
            calle: row.calle || "",
            nro_casa: row.nro_casa || "",
            residente: row.residente || "",
            telefono_interfon: row.telefono_interfon || "",
            asig_estatus: row.asig_est === 1 ? "ACTIVA" : "CANCELADA",
            fecha_vencimiento: row.fv || "",
          };
        }
      }
    }

    // Paso 4: Combinar datos
    const serialized = tarjetas.map((t) => {
      const asig = asignacionMap[String(t.id)] || null;
      let fechaReg = "";
      try {
        if (t.fecha) {
          const d = new Date(t.fecha);
          if (!isNaN(d.getTime()) && d.getFullYear() > 1970) {
            fechaReg = d.toISOString().slice(0, 10);
          }
        }
      } catch { /* ignore */ }

      return {
        tarjeta_id: t.id,
        lectura: t.lectura || "",
        numero_serie: t.numeroSerie || "",
        tipo_id: t.tipoId,
        tipo: TIPO_LABELS[t.tipoId] || "",
        estatus_id: t.estatusId,
        estatus: ESTATUS_LABELS[t.estatusId] || "",
        observaciones: t.observaciones || "",
        fecha_registro: fechaReg,
        folio_contrato: asig?.folio_contrato || "",
        privada: asig?.privada || "",
        calle: asig?.calle || "",
        nro_casa: asig?.nro_casa || "",
        residente: asig?.residente || "",
        telefono_interfon: asig?.telefono_interfon || "",
        asig_estatus: asig?.asig_estatus || "",
        fecha_vencimiento: asig?.fecha_vencimiento || "",
      };
    });

    if (!isExcel) {
      return NextResponse.json({
        data: serialized,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
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

    const ws = workbook.addWorksheet("Listado Tarjetas");
    const excelHeaders = [
      "No.", "Lectura", "No. Serie", "Tipo", "Estatus Tarjeta",
      "Folio Contrato", "Privada", "Calle", "Casa", "Residente",
      "Tel. Interfon", "Estatus Asignacion", "Vencimiento",
      "Observaciones", "Fecha Registro"
    ];

    ws.mergeCells("A1:O1");
    const tc = ws.getCell("A1");
    tc.value = "LISTADO DE TARJETAS";
    tc.font = { bold: true, size: 14, color: { argb: "FF1E40AF" } };
    tc.alignment = { horizontal: "center" };
    ws.addRow([]);
    const hRow = ws.addRow(excelHeaders);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    hRow.eachCell((c: any) => { c.style = headerStyle; });

    const estatusColors: Record<string, string> = {
      ACTIVA: "FF16A34A", ASIGNADA: "FF2563EB", DANADA: "FFDC2626",
      CONSIGNACION: "FFD97706", BAJA: "FF6B7280",
    };

    for (const [i, row] of serialized.entries()) {
      const dr = ws.addRow([
        i + 1, row.lectura, row.numero_serie, row.tipo, row.estatus,
        row.folio_contrato, row.privada, row.calle, row.nro_casa,
        row.residente, row.telefono_interfon, row.asig_estatus,
        row.fecha_vencimiento, row.observaciones, row.fecha_registro,
      ]);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      dr.eachCell((c: any) => { c.border = cellBorder; });
      const color = estatusColors[row.estatus] || "";
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
        "Content-Disposition": `attachment; filename="Listado_Tarjetas.xlsx"`,
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Error al generar listado de tarjetas:", msg, error);
    return NextResponse.json(
      { error: `Error al generar listado: ${msg}` },
      { status: 500 }
    );
  }
}
