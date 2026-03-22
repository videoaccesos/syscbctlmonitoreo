import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/procesos/mensualidades/resumen
// Devuelve el estado de cada privada con mensualidad activa:
// último periodo pagado, siguiente pendiente, meses adeudados
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const periodoActual = searchParams.get("periodoActual") ||
      new Date().toISOString().slice(0, 7); // YYYY-MM

    // Privadas activas con mensualidad habilitada
    const privadas = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT p.privada_id, p.descripcion, p.precio_mensualidad,
              p.pago_mensualidad, p.vence_contrato
       FROM privadas p
       WHERE p.estatus_id = 1 AND p.pago_mensualidad = 1
       ORDER BY p.descripcion`
    );

    // Último pago por privada
    const ultimosPagos = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT privada_id, MAX(periodo) AS ultimo_periodo,
              COUNT(*) AS total_pagos,
              SUM(total) AS total_cobrado
       FROM folios_mensualidades
       WHERE estatus_id = 1
       GROUP BY privada_id`
    );

    const pagoMap: Record<number, {
      ultimo_periodo: string;
      total_pagos: number;
      total_cobrado: number;
    }> = {};
    for (const row of ultimosPagos) {
      pagoMap[Number(row.privada_id)] = {
        ultimo_periodo: String(row.ultimo_periodo || ""),
        total_pagos: Number(row.total_pagos || 0),
        total_cobrado: Number(typeof row.total_cobrado === "bigint"
          ? Number(row.total_cobrado)
          : row.total_cobrado || 0),
      };
    }

    // Calcular meses adeudados para cada privada
    const resumen = privadas.map((p) => {
      const privadaId = Number(p.privada_id);
      const pago = pagoMap[privadaId];
      const ultimoPeriodo = pago?.ultimo_periodo || null;

      // Calcular siguiente periodo pendiente
      let siguientePendiente: string | null = null;
      let mesesAdeudados = 0;

      if (!ultimoPeriodo) {
        // Nunca ha pagado — no podemos saber cuántos meses debe sin fecha de inicio
        siguientePendiente = null;
        mesesAdeudados = 0;
      } else {
        // Calcular el siguiente periodo después del último pagado
        const [uy, um] = ultimoPeriodo.split("-").map(Number);
        let nextY = uy;
        let nextM = um + 1;
        if (nextM > 12) { nextM = 1; nextY++; }
        siguientePendiente = `${nextY}-${String(nextM).padStart(2, "0")}`;

        // Contar meses adeudados desde siguiente hasta periodo actual
        const [cy, cm] = periodoActual.split("-").map(Number);
        if (siguientePendiente <= periodoActual) {
          mesesAdeudados = (cy - nextY) * 12 + (cm - nextM) + 1;
        }
      }

      return {
        privada_id: privadaId,
        privada: String(p.descripcion),
        precio_mensualidad: Number(p.precio_mensualidad),
        ultimo_periodo: ultimoPeriodo,
        siguiente_pendiente: siguientePendiente,
        meses_adeudados: mesesAdeudados,
        deuda_estimada: mesesAdeudados * Number(p.precio_mensualidad),
        total_pagos: pago?.total_pagos || 0,
        total_cobrado: pago?.total_cobrado || 0,
        al_corriente: mesesAdeudados === 0,
      };
    });

    // KPIs
    const totalPrivadas = resumen.length;
    const alCorriente = resumen.filter((r) => r.al_corriente).length;
    const conAdeudo = resumen.filter((r) => r.meses_adeudados > 0).length;
    const sinPagos = resumen.filter((r) => !r.ultimo_periodo).length;
    const deudaTotal = resumen.reduce((s, r) => s + r.deuda_estimada, 0);
    const cobradoTotal = resumen.reduce((s, r) => s + r.total_cobrado, 0);

    return NextResponse.json({
      periodoActual,
      kpis: {
        totalPrivadas,
        alCorriente,
        conAdeudo,
        sinPagos,
        deudaTotal,
        cobradoTotal,
      },
      resumen: resumen.sort((a, b) => b.meses_adeudados - a.meses_adeudados),
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Error al obtener resumen de mensualidades:", msg);
    return NextResponse.json({ error: `Error: ${msg}` }, { status: 500 });
  }
}
