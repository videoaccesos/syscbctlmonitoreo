import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureMensualidadesSchema } from "@/lib/ensure-mensualidades";

// Helper: obtener el periodo siguiente a uno dado (YYYY-MM)
function nextPeriodo(periodo: string): string {
  const [y, m] = periodo.split("-").map(Number);
  if (m === 12) return `${y + 1}-01`;
  return `${y}-${String(m + 1).padStart(2, "0")}`;
}

// Helper: obtener el periodo anterior
function prevPeriodo(periodo: string): string {
  const [y, m] = periodo.split("-").map(Number);
  if (m === 1) return `${y - 1}-12`;
  return `${y}-${String(m - 1).padStart(2, "0")}`;
}

// GET /api/procesos/mensualidades
// ?privadaId=&periodo=YYYY-MM&fechaIni=&fechaFin=&estatusId=&page=1&limit=50
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    await ensureMensualidadesSchema();

    const { searchParams } = new URL(request.url);
    const privadaId = searchParams.get("privadaId");
    const periodo = searchParams.get("periodo");
    const fechaIni = searchParams.get("fechaIni");
    const fechaFin = searchParams.get("fechaFin");
    const estatusId = searchParams.get("estatusId");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));
    const skip = (page - 1) * limit;

    // Construir WHERE dinámico
    const conditions: string[] = ["1=1"];
    const params: unknown[] = [];

    if (privadaId) {
      conditions.push("fm.privada_id = ?");
      params.push(Number(privadaId));
    }
    if (periodo) {
      conditions.push("fm.periodo = ?");
      params.push(periodo);
    }
    if (fechaIni) {
      conditions.push("fm.fecha >= ?");
      params.push(fechaIni);
    }
    if (fechaFin) {
      conditions.push("fm.fecha <= ?");
      params.push(fechaFin);
    }
    if (estatusId) {
      conditions.push("fm.estatus_id = ?");
      params.push(Number(estatusId));
    } else {
      // Por defecto solo activos
      conditions.push("fm.estatus_id = 1");
    }

    const whereClause = conditions.join(" AND ");

    // Contar total
    const countResult = await prisma.$queryRawUnsafe<Array<{ total: number | bigint }>>(
      `SELECT COUNT(*) AS total
       FROM folios_mensualidades fm
       INNER JOIN privadas p ON fm.privada_id = p.privada_id
       WHERE ${whereClause}`,
      ...params
    );
    const total = Number(countResult[0]?.total || 0);

    // Obtener registros
    const rows = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT
        fm.folio_mensualidad_id,
        fm.privada_id,
        p.descripcion AS privada,
        fm.periodo,
        fm.total,
        fm.tipo_pago,
        (CASE fm.tipo_pago WHEN 1 THEN 'EFECTIVO' WHEN 2 THEN 'BANCOS' END) AS tipo_pago_desc,
        CAST(fm.fecha AS CHAR) AS fecha,
        fm.observaciones,
        fm.estatus_id,
        (CASE fm.estatus_id WHEN 1 THEN 'ACTIVO' WHEN 2 THEN 'CANCELADO' END) AS estatus,
        CAST(fm.fecha_modificacion AS CHAR) AS fecha_modificacion,
        fm.usuario_mod_id
       FROM folios_mensualidades fm
       INNER JOIN privadas p ON fm.privada_id = p.privada_id
       WHERE ${whereClause}
       ORDER BY fm.periodo DESC, p.descripcion ASC
       LIMIT ? OFFSET ?`,
      ...params, limit, skip
    );

    const serialize = (data: Array<Record<string, unknown>>) =>
      data.map((row) => {
        const obj: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(row)) {
          obj[k] = typeof v === "bigint" ? Number(v) : v;
        }
        return obj;
      });

    return NextResponse.json({
      data: serialize(rows),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Error al listar mensualidades:", msg);
    return NextResponse.json({ error: `Error: ${msg}` }, { status: 500 });
  }
}

// POST /api/procesos/mensualidades
// Body: { privadaId, periodo (YYYY-MM), total?, tipoPago (1|2), observaciones? }
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    await ensureMensualidadesSchema();

    const body = await request.json();
    const { privadaId, periodo, tipoPago, observaciones } = body;

    // --- Validaciones básicas ---
    if (!privadaId || !periodo || !tipoPago) {
      return NextResponse.json(
        { error: "Campos requeridos: privadaId, periodo, tipoPago" },
        { status: 400 }
      );
    }

    // Validar formato de periodo
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(periodo)) {
      return NextResponse.json(
        { error: "Formato de periodo inválido. Use YYYY-MM (ej: 2026-03)" },
        { status: 400 }
      );
    }

    if (![1, 2].includes(Number(tipoPago))) {
      return NextResponse.json(
        { error: "tipoPago debe ser 1 (Efectivo) o 2 (Bancos)" },
        { status: 400 }
      );
    }

    // --- Validar privada ---
    const privada = await prisma.privada.findUnique({
      where: { id: Number(privadaId) },
    });

    if (!privada) {
      return NextResponse.json({ error: "Privada no encontrada" }, { status: 404 });
    }
    if (privada.estatusId !== 1) {
      return NextResponse.json(
        { error: "La privada no está activa" },
        { status: 400 }
      );
    }
    if (privada.pagoMensualidad !== 1) {
      return NextResponse.json(
        { error: `La privada "${privada.descripcion}" no tiene habilitado el pago de mensualidad` },
        { status: 400 }
      );
    }

    // --- Prevención de doble cobro ---
    const existente = await prisma.$queryRawUnsafe<Array<{ cnt: number | bigint }>>(
      `SELECT COUNT(*) AS cnt FROM folios_mensualidades
       WHERE privada_id = ? AND periodo = ? AND estatus_id = 1`,
      Number(privadaId), periodo
    );

    if (Number(existente[0]?.cnt) > 0) {
      return NextResponse.json(
        { error: `Ya existe un pago activo para el periodo ${periodo} de esta privada` },
        { status: 409 }
      );
    }

    // --- Validación secuencial: no permitir meses salteados ---
    // Obtener el último periodo pagado para esta privada
    const ultimoPago = await prisma.$queryRawUnsafe<Array<{ periodo: string }>>(
      `SELECT periodo FROM folios_mensualidades
       WHERE privada_id = ? AND estatus_id = 1
       ORDER BY periodo DESC
       LIMIT 1`,
      Number(privadaId)
    );

    if (ultimoPago.length > 0) {
      const ultimoPeriodo = ultimoPago[0].periodo;
      const periodoEsperado = nextPeriodo(ultimoPeriodo);

      if (periodo !== periodoEsperado) {
        if (periodo < periodoEsperado) {
          return NextResponse.json(
            { error: `El periodo ${periodo} ya fue cubierto o es anterior al último pago (${ultimoPeriodo})` },
            { status: 400 }
          );
        }
        // periodo > periodoEsperado → hay meses salteados
        return NextResponse.json(
          { error: `No se puede pagar ${periodo}. El siguiente periodo pendiente es ${periodoEsperado}. No se permiten meses salteados.` },
          { status: 400 }
          );
      }
    }
    // Si no hay pagos previos, cualquier periodo es válido (primer pago)

    // --- Determinar monto ---
    const total = body.total !== undefined && body.total !== null
      ? Number(body.total)
      : privada.precioMensualidad;

    if (total <= 0) {
      return NextResponse.json(
        { error: "El monto debe ser mayor a 0" },
        { status: 400 }
      );
    }

    // --- Insertar pago ---
    const userId = Number((session.user as Record<string, unknown>)?.id || 0);
    const fechaHoy = new Date().toISOString().slice(0, 10);

    await prisma.$executeRawUnsafe(
      `INSERT INTO folios_mensualidades
        (privada_id, periodo, total, tipo_pago, fecha, observaciones, estatus_id, fecha_modificacion, usuario_mod_id, concepto)
       VALUES (?, ?, ?, ?, ?, ?, 1, NOW(), ?, 'MENSUALIDAD')`,
      Number(privadaId),
      periodo,
      total,
      Number(tipoPago),
      fechaHoy,
      observaciones || "",
      userId
    );

    // Obtener el registro insertado
    const inserted = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT folio_mensualidad_id, privada_id, periodo, total, tipo_pago, fecha, estatus_id
       FROM folios_mensualidades
       WHERE privada_id = ? AND periodo = ? AND estatus_id = 1
       ORDER BY folio_mensualidad_id DESC LIMIT 1`,
      Number(privadaId), periodo
    );

    return NextResponse.json({
      message: `Pago de mensualidad registrado para periodo ${periodo}`,
      data: inserted[0] ? Object.fromEntries(
        Object.entries(inserted[0]).map(([k, v]) => [k, typeof v === "bigint" ? Number(v) : v])
      ) : null,
    }, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Error al registrar mensualidad:", msg);
    return NextResponse.json({ error: `Error: ${msg}` }, { status: 500 });
  }
}
