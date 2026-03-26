import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureGastosSchema } from "@/lib/ensure-gastos-schema";

// GET /api/procesos/gastos - Listar gastos con filtros y paginacion
export async function GET(request: NextRequest) {
  try {
    await ensureGastosSchema();

    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const privadaId = searchParams.get("privadaId");
    const fechaDesde = searchParams.get("fechaDesde");
    const fechaHasta = searchParams.get("fechaHasta");
    const tipoPago = searchParams.get("tipoPago");
    const tipoGastoId = searchParams.get("tipoGastoId");
    const cuentaGastoId = searchParams.get("cuentaGastoId");
    const tipoDestino = searchParams.get("tipoDestino");
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const skip = (page - 1) * limit;

    // Construir filtros dinamicamente
    const where: Record<string, unknown> = {
      estatusId: 1,
    };

    if (privadaId) {
      where.privadaId = parseInt(privadaId, 10);
      where.tipoDestino = 0; // solo privadas
    }

    if (tipoDestino) {
      where.tipoDestino = parseInt(tipoDestino, 10);
    }

    if (tipoPago) {
      where.tipoPago = parseInt(tipoPago, 10);
    }

    if (tipoGastoId) {
      where.tipoGastoId = parseInt(tipoGastoId, 10);
    }

    if (cuentaGastoId) {
      where.cuentaGastoId = parseInt(cuentaGastoId, 10);
    }

    if (fechaDesde || fechaHasta) {
      if (fechaDesde && fechaHasta) {
        where.fechaPago = { gte: fechaDesde, lte: fechaHasta };
      } else if (fechaDesde) {
        where.fechaPago = { gte: fechaDesde };
      } else if (fechaHasta) {
        where.fechaPago = { lte: fechaHasta };
      }
    }

    if (search) {
      where.OR = [
        { descripcionGasto: { contains: search } },
        { comprobante: { contains: search } },
      ];
    }

    const [gastos, total, totalSum] = await Promise.all([
      prisma.gasto.findMany({
        where,
        include: {
          tipoGasto: {
            select: { id: true, gasto: true },
          },
          privada: {
            select: { id: true, descripcion: true },
          },
          cuentaGasto: {
            select: { id: true, clave: true, descripcion: true },
          },
        },
        orderBy: { fechaPago: "desc" },
        skip,
        take: limit,
      }),
      prisma.gasto.count({ where }),
      prisma.gasto.aggregate({
        where,
        _sum: { total: true },
      }),
    ]);

    return NextResponse.json({
      data: gastos,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      totalSum: totalSum._sum.total || 0,
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("Error al listar gastos:", errMsg, error);
    return NextResponse.json(
      { error: "Error al obtener gastos: " + errMsg },
      { status: 500 }
    );
  }
}

// POST /api/procesos/gastos - Crear nuevo gasto
export async function POST(request: NextRequest) {
  try {
    await ensureGastosSchema();

    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();

    const {
      tipoGastoId,
      privadaId,
      tipoDestino,
      cuentaGastoId,
      descripcionGasto,
      fechaPago,
      comprobante,
      total,
      tipoPago,
      fecha,
    } = body;

    const td = tipoDestino !== undefined ? parseInt(tipoDestino, 10) : 0;
    const pId = td > 0 ? 0 : parseInt(privadaId || "0", 10);

    // Validacion de campos requeridos
    if (!descripcionGasto || !fechaPago || !total || tipoPago === undefined) {
      return NextResponse.json(
        { error: "Campos requeridos: descripcionGasto, fechaPago, total, tipoPago" },
        { status: 400 }
      );
    }

    if (td === 0 && pId === 0) {
      return NextResponse.json(
        { error: "Debe seleccionar un destino (privada o tipo de gasto corporativo)" },
        { status: 400 }
      );
    }

    // Si es privada, validar que exista
    if (td === 0 && pId > 0) {
      const privada = await prisma.privada.findFirst({
        where: { id: pId, estatusId: 1 },
      });
      if (!privada) {
        return NextResponse.json({ error: "Privada no encontrada" }, { status: 404 });
      }
    }

    const tgId = tipoGastoId ? parseInt(tipoGastoId, 10) : 1;
    const cgId = cuentaGastoId ? parseInt(cuentaGastoId, 10) : 0;
    const desc = descripcionGasto.trim();
    const fp = String(fechaPago) || "";
    const comp = comprobante?.trim() || "";
    const tot = parseFloat(total);
    const tp = parseInt(tipoPago, 10);
    const f = fecha ? String(fecha) : "";

    const usuarioId = session.user?.usuarioId ?? 0;

    // Para gastos corporativos (privadaId=0), desactivar FK check temporalmente
    if (td > 0) {
      await prisma.$executeRawUnsafe(`SET FOREIGN_KEY_CHECKS=0`);
    }

    try {
      await prisma.$executeRawUnsafe(
        `INSERT INTO gastos (tipo_gasto, privada_id, tipo_destino, cuenta_gasto_id, descripcion_gasto, fecha_pago, comprobante, total, tipo_pago, fecha, usuario_id, estatus_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        tgId, pId, td, cgId, desc, fp, comp, tot, tp, f, usuarioId
      );
    } finally {
      if (td > 0) {
        await prisma.$executeRawUnsafe(`SET FOREIGN_KEY_CHECKS=1`);
      }
    }

    return NextResponse.json({ message: "Gasto registrado exitosamente" }, { status: 201 });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("Error al crear gasto:", errMsg, error);
    return NextResponse.json(
      { error: "Error al crear gasto: " + errMsg },
      { status: 500 }
    );
  }
}
