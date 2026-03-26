import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/herramientas/ingresos?fechaIni=YYYY-MM-DD&fechaFin=YYYY-MM-DD
// Dashboard consolidado de ingresos: mensualidades, tarjetas (ventas/renovaciones), remisiones
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

    // Periodo en formato YYYY-MM para mensualidades
    const periodoIni = fechaIni.substring(0, 7); // "YYYY-MM"
    const periodoFin = fechaFin.substring(0, 7);

    // --- 1. MENSUALIDADES ---
    // Cobrado: pagos realizados en el rango de fechas
    const sqlMensualidadesCobrado = `
      SELECT fm.privada_id, p.descripcion AS privada,
             COUNT(*) AS pagos, SUM(fm.total) AS cobrado
      FROM folios_mensualidades fm
      INNER JOIN privadas p ON fm.privada_id = p.privada_id
      WHERE fm.fecha >= ? AND fm.fecha <= ?
        AND fm.estatus_id = 1
      GROUP BY fm.privada_id, p.descripcion
      ORDER BY p.descripcion
    `;

    // Esperado: privadas con pago_mensualidad=1 x meses en el rango x precio_mensualidad
    const sqlMensualidadesEsperado = `
      SELECT p.privada_id, p.descripcion AS privada,
             p.precio_mensualidad AS precio
      FROM privadas p
      WHERE p.estatus_id = 1 AND p.pago_mensualidad = 1
      ORDER BY p.descripcion
    `;

    // --- 2. TARJETAS (ventas y renovaciones) ---
    const buildUnion = (where: string) => `
      SELECT a.asignacion_id, a.precio, a.descuento, (a.precio - a.descuento) AS neto,
             CAST(NULLIF(a.fecha, '0000-00-00') AS CHAR) AS fecha,
             a.concepto, a.utilizo_seguro, t.tipo_id,
             p.descripcion AS privada, p.privada_id,
             'H' AS folio_tipo
      FROM residencias_residentes_tarjetas a
      INNER JOIN tarjetas t ON a.tarjeta_id = t.tarjeta_id
      INNER JOIN residencias_residentes r ON a.residente_id = r.residente_id
      INNER JOIN residencias res ON r.residencia_id = res.residencia_id
      INNER JOIN privadas p ON res.privada_id = p.privada_id
      WHERE ${where} AND p.estatus_id = 1
      UNION ALL
      SELECT a.asignacion_id, a.precio, a.descuento, (a.precio - a.descuento) AS neto,
             CAST(NULLIF(a.fecha, '0000-00-00') AS CHAR) AS fecha,
             a.concepto, a.utilizo_seguro, t.tipo_id,
             p.descripcion AS privada, p.privada_id,
             'B' AS folio_tipo
      FROM residencias_residentes_tarjetas_no_renovacion a
      INNER JOIN tarjetas t ON a.tarjeta_id = t.tarjeta_id
      INNER JOIN residencias_residentes r ON a.residente_id = r.residente_id
      INNER JOIN residencias res ON r.residencia_id = res.residencia_id
      INNER JOIN privadas p ON res.privada_id = p.privada_id
      WHERE ${where} AND p.estatus_id = 1
    `;

    const sqlTarjetasVentas = `
      SELECT v.privada_id, v.privada, v.tipo_id, v.folio_tipo,
             COUNT(*) AS cantidad, SUM(v.neto) AS cobrado
      FROM (${buildUnion("a.fecha >= ? AND a.fecha <= ? AND a.estatus_id = 1 AND a.utilizo_seguro = 0")}) v
      GROUP BY v.privada_id, v.privada, v.tipo_id, v.folio_tipo
      ORDER BY v.privada
    `;

    // Esperado tarjetas: vencimientos en el periodo x precio de la privada
    const sqlTarjetasEsperado = `
      SELECT p.privada_id, p.descripcion AS privada, t.tipo_id,
             COUNT(*) AS cantidad,
             SUM(CASE t.tipo_id WHEN 2 THEN p.precio_vehicular WHEN 1 THEN p.precio_peatonal ELSE 0 END) AS esperado
      FROM residencias_residentes_tarjetas a
      INNER JOIN tarjetas t ON a.tarjeta_id = t.tarjeta_id
      INNER JOIN residencias_residentes r ON a.residente_id = r.residente_id
      INNER JOIN residencias res ON r.residencia_id = res.residencia_id
      INNER JOIN privadas p ON res.privada_id = p.privada_id
      WHERE a.fecha_vencimiento >= ? AND a.fecha_vencimiento <= ?
        AND a.estatus_id = 1 AND p.estatus_id = 1
      GROUP BY p.privada_id, p.descripcion, t.tipo_id
      ORDER BY p.descripcion
    `;

    // --- 3. REMISIONES ---
    const sqlRemisiones = `
      SELECT concepto, SUM(total) AS cobrado, COUNT(*) AS cantidad
      FROM folios_remisiones
      WHERE fecha >= ? AND fecha <= ? AND estatus_id = 1
      GROUP BY concepto
      ORDER BY concepto
    `;

    // Ejecutar todas las queries en paralelo
    const [
      mensualidadesCobradoRaw,
      mensualidadesEsperadoRaw,
      tarjetasVentasRaw,
      tarjetasEsperadoRaw,
      remisionesRaw,
    ] = await Promise.all([
      prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
        sqlMensualidadesCobrado, fechaIni, fechaFin
      ),
      prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
        sqlMensualidadesEsperado
      ),
      prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
        sqlTarjetasVentas, fechaIni, fechaFin, fechaIni, fechaFin
      ),
      prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
        sqlTarjetasEsperado, fechaIni, fechaFin
      ),
      prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
        sqlRemisiones, fechaIni, fechaFin
      ),
    ]);

    const serialize = (rows: Array<Record<string, unknown>>) =>
      rows.map((row) => {
        const obj: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(row)) {
          obj[k] = typeof v === "bigint" ? Number(v) : v;
        }
        return obj;
      });

    const mensualidadesCobrado = serialize(mensualidadesCobradoRaw);
    const mensualidadesEsperado = serialize(mensualidadesEsperadoRaw);
    const tarjetasVentas = serialize(tarjetasVentasRaw);
    const tarjetasEsperado = serialize(tarjetasEsperadoRaw);
    const remisiones = serialize(remisionesRaw);

    // Calcular meses en el rango para el esperado de mensualidades
    const [iy, im] = periodoIni.split("-").map(Number);
    const [fy, fm] = periodoFin.split("-").map(Number);
    const mesesEnRango = (fy - iy) * 12 + (fm - im) + 1;

    // --- KPIs globales ---
    // Mensualidades
    const mensualidadCobrado = mensualidadesCobrado.reduce(
      (s, r) => s + Number(r.cobrado || 0), 0
    );
    const mensualidadEsperado = mensualidadesEsperado.reduce(
      (s, r) => s + Number(r.precio || 0) * mesesEnRango, 0
    );

    // Tarjetas
    const tarjetaCobrado = tarjetasVentas.reduce(
      (s, r) => s + Number(r.cobrado || 0), 0
    );
    const tarjetaEsperado = tarjetasEsperado.reduce(
      (s, r) => s + Number(r.esperado || 0), 0
    );

    // Remisiones
    const remisionCobrado = remisiones.reduce(
      (s, r) => s + Number(r.cobrado || 0), 0
    );

    // Consolidar por privada para tabla detallada
    const porPrivada: Record<string, {
      privada: string;
      mensualidadEsperado: number;
      mensualidadCobrado: number;
      tarjetaEsperado: number;
      tarjetaCobrado: number;
    }> = {};

    // Esperado mensualidades
    for (const r of mensualidadesEsperado) {
      const key = String(r.privada);
      if (!porPrivada[key]) {
        porPrivada[key] = {
          privada: key,
          mensualidadEsperado: 0, mensualidadCobrado: 0,
          tarjetaEsperado: 0, tarjetaCobrado: 0,
        };
      }
      porPrivada[key].mensualidadEsperado += Number(r.precio || 0) * mesesEnRango;
    }

    // Cobrado mensualidades
    for (const r of mensualidadesCobrado) {
      const key = String(r.privada);
      if (!porPrivada[key]) {
        porPrivada[key] = {
          privada: key,
          mensualidadEsperado: 0, mensualidadCobrado: 0,
          tarjetaEsperado: 0, tarjetaCobrado: 0,
        };
      }
      porPrivada[key].mensualidadCobrado += Number(r.cobrado || 0);
    }

    // Esperado tarjetas
    for (const r of tarjetasEsperado) {
      const key = String(r.privada);
      if (!porPrivada[key]) {
        porPrivada[key] = {
          privada: key,
          mensualidadEsperado: 0, mensualidadCobrado: 0,
          tarjetaEsperado: 0, tarjetaCobrado: 0,
        };
      }
      porPrivada[key].tarjetaEsperado += Number(r.esperado || 0);
    }

    // Cobrado tarjetas
    for (const r of tarjetasVentas) {
      const key = String(r.privada);
      if (!porPrivada[key]) {
        porPrivada[key] = {
          privada: key,
          mensualidadEsperado: 0, mensualidadCobrado: 0,
          tarjetaEsperado: 0, tarjetaCobrado: 0,
        };
      }
      porPrivada[key].tarjetaCobrado += Number(r.cobrado || 0);
    }

    const concentrado = Object.values(porPrivada)
      .map((p) => ({
        ...p,
        totalEsperado: p.mensualidadEsperado + p.tarjetaEsperado,
        totalCobrado: p.mensualidadCobrado + p.tarjetaCobrado,
        avance: (p.mensualidadEsperado + p.tarjetaEsperado) > 0
          ? ((p.mensualidadCobrado + p.tarjetaCobrado) / (p.mensualidadEsperado + p.tarjetaEsperado)) * 100
          : 0,
      }))
      .sort((a, b) => a.privada.localeCompare(b.privada));

    const totalEsperado = mensualidadEsperado + tarjetaEsperado;
    const totalCobrado = mensualidadCobrado + tarjetaCobrado + remisionCobrado;

    return NextResponse.json({
      fechaIni,
      fechaFin,
      mesesEnRango,
      kpis: {
        mensualidad: { esperado: mensualidadEsperado, cobrado: mensualidadCobrado },
        tarjetas: { esperado: tarjetaEsperado, cobrado: tarjetaCobrado },
        remisiones: { esperado: 0, cobrado: remisionCobrado },
        total: {
          esperado: totalEsperado,
          cobrado: totalCobrado,
          avance: totalEsperado > 0 ? (totalCobrado / totalEsperado) * 100 : 0,
        },
      },
      concentrado,
      detalle: {
        mensualidades: mensualidadesCobrado,
        tarjetas: tarjetasVentas,
        remisiones,
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Error en dashboard de ingresos:", msg);
    return NextResponse.json({ error: `Error: ${msg}` }, { status: 500 });
  }
}
