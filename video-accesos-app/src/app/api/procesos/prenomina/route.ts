import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureGastosSchema } from "@/lib/ensure-gastos-schema";

// GET /api/procesos/prenomina?periodo=YYYY-MM&quincena=1|2
export async function GET(request: NextRequest) {
  try {
    await ensureGastosSchema();
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const periodo = searchParams.get("periodo");
    const quincena = searchParams.get("quincena");

    if (!periodo || !quincena) {
      return NextResponse.json(
        { error: "Parámetros requeridos: periodo (YYYY-MM) y quincena (1 o 2)" },
        { status: 400 }
      );
    }

    // Buscar prenomina existente
    const registros = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT p.prenomina_id, p.empleado_id, p.periodo, p.quincena,
              p.sueldo_base, p.dias_trabajados, p.deducciones, p.percepciones,
              p.total_pagar, p.observaciones, p.estatus_id,
              CAST(p.fecha_creacion AS CHAR) AS fecha_creacion,
              e.nombre, e.ape_paterno, e.ape_materno,
              pu.descripcion AS puesto
       FROM prenomina p
       INNER JOIN empleados e ON p.empleado_id = e.empleado_id
       INNER JOIN puestos pu ON e.puesto_id = pu.puesto_id
       WHERE p.periodo = ? AND p.quincena = ?
       ORDER BY e.ape_paterno, e.ape_materno, e.nombre`,
      periodo,
      Number(quincena)
    );

    const serialize = (rows: Array<Record<string, unknown>>) =>
      rows.map((row) => {
        const obj: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(row)) {
          obj[k] = typeof v === "bigint" ? Number(v) : v;
        }
        return obj;
      });

    // KPIs
    let totalNomina = 0;
    let totalDeducciones = 0;
    let totalPercepciones = 0;
    for (const r of registros) {
      totalNomina += Number(r.total_pagar || 0);
      totalDeducciones += Number(r.deducciones || 0);
      totalPercepciones += Number(r.percepciones || 0);
    }

    return NextResponse.json({
      data: serialize(registros),
      total: registros.length,
      kpis: {
        totalEmpleados: registros.length,
        totalNomina,
        totalDeducciones,
        totalPercepciones,
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Error al consultar prenomina:", msg);
    return NextResponse.json({ error: `Error: ${msg}` }, { status: 500 });
  }
}

// POST /api/procesos/prenomina/generar
// Body: { periodo: "YYYY-MM", quincena: 1|2 }
// Genera la prenomina para todos los empleados activos
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { periodo, quincena } = body;

    if (!periodo || !quincena) {
      return NextResponse.json(
        { error: "Campos requeridos: periodo (YYYY-MM) y quincena (1 o 2)" },
        { status: 400 }
      );
    }

    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(periodo)) {
      return NextResponse.json(
        { error: "Formato de periodo inválido. Use YYYY-MM" },
        { status: 400 }
      );
    }

    if (![1, 2].includes(Number(quincena))) {
      return NextResponse.json(
        { error: "Quincena debe ser 1 (1ra) o 2 (2da)" },
        { status: 400 }
      );
    }

    const userId = Number((session.user as Record<string, unknown>)?.id || 0);
    const q = Number(quincena);

    // Verificar si ya existe prenomina para este periodo/quincena
    const existente = await prisma.$queryRawUnsafe<Array<{ cnt: number | bigint }>>(
      `SELECT COUNT(*) AS cnt FROM prenomina
       WHERE periodo = ? AND quincena = ? AND estatus_id != 4`,
      periodo, q
    );

    if (Number(existente[0]?.cnt) > 0) {
      return NextResponse.json(
        { error: `Ya existe una prenomina para ${periodo} quincena ${q}. Cancélela primero si desea regenerar.` },
        { status: 409 }
      );
    }

    // Obtener empleados activos con sueldo > 0
    const empleados = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT empleado_id, sueldo FROM empleados
       WHERE estatus_id = 1 AND sueldo > 0
       ORDER BY ape_paterno, ape_materno, nombre`
    );

    if (empleados.length === 0) {
      return NextResponse.json(
        { error: "No hay empleados activos con sueldo configurado" },
        { status: 400 }
      );
    }

    // Generar registros de prenomina
    // Quincena = sueldo / 2, 15 dias por quincena
    let insertados = 0;
    for (const emp of empleados) {
      const sueldoBase = Number(emp.sueldo || 0);
      const montoQuincena = sueldoBase / 2;

      await prisma.$executeRawUnsafe(
        `INSERT INTO prenomina
          (empleado_id, periodo, quincena, sueldo_base, dias_trabajados, deducciones, percepciones, total_pagar, observaciones, estatus_id, fecha_creacion, fecha_modificacion, usuario_mod_id)
         VALUES (?, ?, ?, ?, 15, 0, 0, ?, NULL, 1, NOW(), NOW(), ?)`,
        Number(emp.empleado_id),
        periodo,
        q,
        sueldoBase,
        montoQuincena,
        userId
      );
      insertados++;
    }

    return NextResponse.json({
      message: `Prenomina generada: ${insertados} empleados para ${periodo} Q${q}`,
      total: insertados,
    }, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Error al generar prenomina:", msg);
    return NextResponse.json({ error: `Error: ${msg}` }, { status: 500 });
  }
}
