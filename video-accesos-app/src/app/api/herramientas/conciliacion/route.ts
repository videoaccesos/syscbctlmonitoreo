import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/herramientas/conciliacion?fechaIni=YYYY-MM-DD&fechaFin=YYYY-MM-DD
// Concilia tarjetas vencidas vs renovaciones/ventas en un periodo
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const fechaIni = searchParams.get("fechaIni");
    const fechaFin = searchParams.get("fechaFin");
    const privadaId = searchParams.get("privadaId"); // opcional

    if (!fechaIni || !fechaFin) {
      return NextResponse.json(
        { error: "Campos requeridos: fechaIni, fechaFin" },
        { status: 400 }
      );
    }

    const privadaFilter = privadaId ? "AND p.privada_id = ?" : "";
    const privadaParams = privadaId ? [Number(privadaId)] : [];

    // 1. Tarjetas vencidas en el periodo (solo Folio H, solo privadas con renovacion=1)
    const sqlVencidas = `
      SELECT
        a.asignacion_id,
        a.tarjeta_id,
        t.tipo_id,
        (CASE t.tipo_id WHEN 2 THEN 'VEHICULAR' WHEN 1 THEN 'PEATONAL' END) AS tipo,
        CAST(NULLIF(a.fecha_vencimiento, '0000-00-00') AS CHAR) AS fecha_vencimiento,
        CAST(NULLIF(a.fecha, '0000-00-00') AS CHAR) AS fecha_asignacion,
        a.precio, a.descuento,
        (a.precio - a.descuento) AS neto,
        CONCAT_WS(' ', r.nombre, r.ape_paterno, r.ape_materno) AS residente,
        r.residente_id,
        res.residencia_id,
        p.privada_id,
        p.descripcion AS privada,
        p.renovacion AS privada_renovacion,
        res.nro_casa, res.calle,
        res.telefono_interfon AS telefono,
        t.lectura,
        (CASE t.tipo_id WHEN 2 THEN p.precio_vehicular WHEN 1 THEN p.precio_peatonal ELSE 0 END) AS precio_renovacion,
        -- Verificar si fue renovada: existe asignacion posterior para mismo residente+residencia
        (
          SELECT MAX(r2.asignacion_id)
          FROM residencias_residentes_tarjetas r2
          INNER JOIN residencias_residentes rr2 ON r2.residente_id = rr2.residente_id
          WHERE rr2.residencia_id = res.residencia_id
            AND r2.asignacion_id > a.asignacion_id
            AND r2.estatus_id = 1
        ) AS renovacion_asignacion_h,
        (
          SELECT MAX(r3.asignacion_id)
          FROM residencias_residentes_tarjetas_no_renovacion r3
          INNER JOIN residencias_residentes rr3 ON r3.residente_id = rr3.residente_id
          WHERE rr3.residencia_id = res.residencia_id
            AND r3.fecha > a.fecha
            AND r3.estatus_id = 1
        ) AS renovacion_asignacion_b
      FROM residencias_residentes_tarjetas a
      INNER JOIN tarjetas t ON a.tarjeta_id = t.tarjeta_id
      INNER JOIN residencias_residentes r ON a.residente_id = r.residente_id
      INNER JOIN residencias res ON r.residencia_id = res.residencia_id
      INNER JOIN privadas p ON res.privada_id = p.privada_id
      WHERE a.estatus_id = 1
        AND p.estatus_id = 1
        AND p.renovacion = 1
        AND a.fecha_vencimiento >= ?
        AND a.fecha_vencimiento <= ?
        AND a.fecha_vencimiento != '0000-00-00'
        ${privadaFilter}
      ORDER BY p.descripcion, a.fecha_vencimiento ASC
    `;

    // 2. Ventas en el periodo (ambas tablas H y B)
    const sqlVentas = `
      SELECT
        a.asignacion_id,
        a.folio_tipo,
        CAST(NULLIF(a.fecha, '0000-00-00') AS CHAR) AS fecha,
        a.tarjeta_id,
        t.lectura,
        t.tipo_id,
        (CASE t.tipo_id WHEN 2 THEN 'VEHICULAR' WHEN 1 THEN 'PEATONAL' END) AS tipo,
        a.precio, a.descuento,
        (a.precio - a.descuento) AS neto,
        CONCAT_WS(' ', r.nombre, r.ape_paterno, r.ape_materno) AS residente,
        p.privada_id,
        p.descripcion AS privada,
        p.renovacion AS privada_renovacion,
        res.nro_casa,
        a.concepto
      FROM (
        SELECT asignacion_id, tarjeta_id, residente_id, fecha, precio, descuento, concepto, estatus_id,
               'H' AS folio_tipo
        FROM residencias_residentes_tarjetas
        WHERE fecha >= ? AND fecha <= ? AND estatus_id = 1
        UNION ALL
        SELECT asignacion_id, tarjeta_id, residente_id, fecha, precio, descuento, concepto, estatus_id,
               'B' AS folio_tipo
        FROM residencias_residentes_tarjetas_no_renovacion
        WHERE fecha >= ? AND fecha <= ? AND estatus_id = 1
      ) a
      INNER JOIN tarjetas t ON a.tarjeta_id = t.tarjeta_id
      INNER JOIN residencias_residentes r ON a.residente_id = r.residente_id
      INNER JOIN residencias res ON r.residencia_id = res.residencia_id
      INNER JOIN privadas p ON res.privada_id = p.privada_id
      WHERE p.estatus_id = 1
        ${privadaFilter}
      ORDER BY p.descripcion, a.fecha
    `;

    // 3. Catálogo de privadas con flag renovacion
    const sqlPrivadas = `
      SELECT privada_id, descripcion, renovacion,
             precio_vehicular, precio_peatonal
      FROM privadas
      WHERE estatus_id = 1
      ORDER BY descripcion
    `;

    const [vencidasRaw, ventasRaw, privadasRaw] = await Promise.all([
      prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
        sqlVencidas, fechaIni, fechaFin, ...privadaParams
      ),
      prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
        sqlVentas, fechaIni, fechaFin, fechaIni, fechaFin, ...privadaParams
      ),
      prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(sqlPrivadas),
    ]);

    // Serializar BigInt
    const serialize = (rows: Array<Record<string, unknown>>) =>
      rows.map((row) => {
        const obj: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(row)) {
          obj[k] = typeof v === "bigint" ? Number(v) : v;
        }
        return obj;
      });

    const vencidas = serialize(vencidasRaw);
    const ventas = serialize(ventasRaw);
    const privadas = serialize(privadasRaw);

    // Clasificar vencidas como renovadas o pendientes
    // Crear set de asignacion_ids que aparecen como ventas en el periodo
    // para evitar que una tarjeta vendida/renovada en el periodo tambien
    // aparezca como "pendiente de renovar"
    const ventasAsignacionIds = new Set(
      ventas.map((v) => Number(v.asignacion_id))
    );

    const renovadas = vencidas.filter(
      (v) => v.renovacion_asignacion_h || v.renovacion_asignacion_b ||
             ventasAsignacionIds.has(Number(v.asignacion_id))
    );
    const pendientes = vencidas.filter(
      (v) => !v.renovacion_asignacion_h && !v.renovacion_asignacion_b &&
             !ventasAsignacionIds.has(Number(v.asignacion_id))
    );

    // Clasificar ventas como "renovación" o "venta nueva" basado en concepto
    const ventasRenovacion = ventas.filter(
      (v) => String(v.concepto || "").toUpperCase().includes("REPOSICION") ||
             String(v.concepto || "").toUpperCase().includes("CAMBIO") ||
             (Number(v.privada_renovacion) === 1 && String(v.folio_tipo) === "H")
    );
    const ventasNuevas = ventas.filter(
      (v) => !(String(v.concepto || "").toUpperCase().includes("REPOSICION") ||
               String(v.concepto || "").toUpperCase().includes("CAMBIO") ||
               (Number(v.privada_renovacion) === 1 && String(v.folio_tipo) === "H"))
    );

    // KPIs generales
    const totalVencidas = vencidas.length;
    const totalRenovadas = renovadas.length;
    const totalPendientes = pendientes.length;
    const tasaRenovacion = totalVencidas > 0 ? (totalRenovadas / totalVencidas) * 100 : 0;
    const ingresoRenovaciones = renovadas.reduce((s, r) => s + (Number(r.precio_renovacion) || 0), 0);
    const ingresoPendiente = pendientes.reduce((s, r) => s + (Number(r.precio_renovacion) || 0), 0);
    const totalVentas = ventas.length;
    const ingresoVentas = ventas.reduce((s, r) => s + (Number(r.neto) || 0), 0);

    // KPIs por tipo de tarjeta
    const vencidasVeh = vencidas.filter((v) => Number(v.tipo_id) === 2).length;
    const vencidasPea = vencidas.filter((v) => Number(v.tipo_id) === 1).length;
    const renovadasVeh = renovadas.filter((v) => Number(v.tipo_id) === 2).length;
    const renovadasPea = renovadas.filter((v) => Number(v.tipo_id) === 1).length;
    const ventasVeh = ventas.filter((v) => Number(v.tipo_id) === 2).length;
    const ventasPea = ventas.filter((v) => Number(v.tipo_id) === 1).length;
    const ingresoVentasVeh = ventas.filter((v) => Number(v.tipo_id) === 2).reduce((s, r) => s + (Number(r.neto) || 0), 0);
    const ingresoVentasPea = ventas.filter((v) => Number(v.tipo_id) === 1).reduce((s, r) => s + (Number(r.neto) || 0), 0);

    // Concentrado por privada
    type PrivadaConc = {
      privada_id: number;
      privada: string;
      renovacion: number;
      vencidas: number;
      renovadas: number;
      pendientes: number;
      tasaRenovacion: number;
      vencidasVeh: number;
      vencidasPea: number;
      renovadasVeh: number;
      renovadasPea: number;
      ingresoRenovacion: number;
      ingresoPendiente: number;
      ventasTotal: number;
      ventasNuevas: number;
      ventasRenovacion: number;
      ingresoVentas: number;
    };

    const concentradoMap: Record<string, PrivadaConc> = {};

    // Inicializar con todas las privadas
    for (const p of privadas) {
      const key = String(p.descripcion);
      concentradoMap[key] = {
        privada_id: Number(p.privada_id),
        privada: key,
        renovacion: Number(p.renovacion),
        vencidas: 0, renovadas: 0, pendientes: 0, tasaRenovacion: 0,
        vencidasVeh: 0, vencidasPea: 0, renovadasVeh: 0, renovadasPea: 0,
        ingresoRenovacion: 0, ingresoPendiente: 0,
        ventasTotal: 0, ventasNuevas: 0, ventasRenovacion: 0, ingresoVentas: 0,
      };
    }

    // Llenar vencidas
    for (const v of vencidas) {
      const key = String(v.privada);
      if (!concentradoMap[key]) continue;
      concentradoMap[key].vencidas++;
      if (Number(v.tipo_id) === 2) concentradoMap[key].vencidasVeh++;
      else concentradoMap[key].vencidasPea++;

      const esRenovada = v.renovacion_asignacion_h || v.renovacion_asignacion_b ||
                         ventasAsignacionIds.has(Number(v.asignacion_id));
      if (esRenovada) {
        concentradoMap[key].renovadas++;
        concentradoMap[key].ingresoRenovacion += Number(v.precio_renovacion) || 0;
        if (Number(v.tipo_id) === 2) concentradoMap[key].renovadasVeh++;
        else concentradoMap[key].renovadasPea++;
      } else {
        concentradoMap[key].pendientes++;
        concentradoMap[key].ingresoPendiente += Number(v.precio_renovacion) || 0;
      }
    }

    // Llenar ventas
    for (const v of ventas) {
      const key = String(v.privada);
      if (!concentradoMap[key]) continue;
      concentradoMap[key].ventasTotal++;
      concentradoMap[key].ingresoVentas += Number(v.neto) || 0;

      const esRenov = String(v.concepto || "").toUpperCase().includes("REPOSICION") ||
                       String(v.concepto || "").toUpperCase().includes("CAMBIO") ||
                       (Number(v.privada_renovacion) === 1 && String(v.folio_tipo) === "H");
      if (esRenov) {
        concentradoMap[key].ventasRenovacion++;
      } else {
        concentradoMap[key].ventasNuevas++;
      }
    }

    // Calcular tasa por privada
    for (const c of Object.values(concentradoMap)) {
      c.tasaRenovacion = c.vencidas > 0 ? (c.renovadas / c.vencidas) * 100 : 0;
    }

    // Filtrar solo privadas con actividad (vencidas o ventas)
    const concentrado = Object.values(concentradoMap)
      .filter((c) => c.vencidas > 0 || c.ventasTotal > 0)
      .sort((a, b) => a.privada.localeCompare(b.privada));

    return NextResponse.json({
      fechaIni,
      fechaFin,
      kpis: {
        totalVencidas,
        totalRenovadas,
        totalPendientes,
        tasaRenovacion: Math.round(tasaRenovacion * 100) / 100,
        ingresoRenovaciones,
        ingresoPendiente,
        totalVentas,
        ingresoVentas,
        ventasNuevas: ventasNuevas.length,
        ventasRenovacion: ventasRenovacion.length,
        // Por tipo
        vencidasVeh,
        vencidasPea,
        renovadasVeh,
        renovadasPea,
        ventasVeh,
        ventasPea,
        ingresoVentasVeh,
        ingresoVentasPea,
      },
      concentrado,
      detalle: {
        renovadas,
        pendientes,
        ventas,
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Error en conciliación:", msg, error);
    return NextResponse.json(
      { error: `Error al generar conciliación: ${msg}` },
      { status: 500 }
    );
  }
}
