import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/procesos/gastos - Listar gastos con filtros y paginacion
export async function GET(request: NextRequest) {
  try {
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
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const skip = (page - 1) * limit;

    // Construir filtros dinamicamente
    const where: Record<string, unknown> = {
      estatusId: 1, // Solo gastos activos por defecto
    };

    if (privadaId) {
      where.privadaId = parseInt(privadaId, 10);
    }

    if (tipoPago) {
      where.tipoPago = parseInt(tipoPago, 10);
    }

    if (tipoGastoId) {
      where.tipoGastoId = parseInt(tipoGastoId, 10);
    }

    // Filtro de fechas - fechaPago is String (VarChar 100), not DateTime
    // Use string comparison for date filtering
    if (fechaDesde || fechaHasta) {
      if (fechaDesde && fechaHasta) {
        where.fechaPago = {
          gte: fechaDesde,
          lte: fechaHasta,
        };
      } else if (fechaDesde) {
        where.fechaPago = {
          gte: fechaDesde,
        };
      } else if (fechaHasta) {
        where.fechaPago = {
          lte: fechaHasta,
        };
      }
    }

    // Busqueda por descripcionGasto o comprobante
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
        },
        orderBy: { fechaPago: "desc" },
        skip,
        take: limit,
      }),
      prisma.gasto.count({ where }),
      prisma.gasto.aggregate({
        where,
        _sum: {
          total: true,
        },
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
    console.error("Error al listar gastos:", error);
    return NextResponse.json(
      { error: "Error al obtener gastos" },
      { status: 500 }
    );
  }
}

// POST /api/procesos/gastos - Crear nuevo gasto
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();

    const {
      tipoGastoId,
      privadaId,
      descripcionGasto,
      fechaPago,
      comprobante,
      total,
      tipoPago,
      fecha,
    } = body;

    // Validacion de campos requeridos
    if (!tipoGastoId || !privadaId || !descripcionGasto || !fechaPago || !total || tipoPago === undefined) {
      return NextResponse.json(
        {
          error:
            "Campos requeridos: tipoGastoId, privadaId, descripcionGasto, fechaPago, total, tipoPago",
        },
        { status: 400 }
      );
    }

    // Validar que la privada existe
    const privada = await prisma.privada.findFirst({
      where: { id: parseInt(privadaId, 10), estatusId: 1 },
    });

    if (!privada) {
      return NextResponse.json(
        { error: "Privada no encontrada" },
        { status: 404 }
      );
    }

    // Validar que el tipo de gasto existe
    const tipoGasto = await prisma.tipoGasto.findFirst({
      where: { id: parseInt(tipoGastoId, 10), estatusId: 1 },
    });

    if (!tipoGasto) {
      return NextResponse.json(
        { error: "Tipo de gasto no encontrado" },
        { status: 404 }
      );
    }

    const gasto = await prisma.gasto.create({
      data: {
        tipoGastoId: parseInt(tipoGastoId, 10),
        privadaId: parseInt(privadaId, 10),
        descripcionGasto: descripcionGasto.trim(),
        fechaPago: String(fechaPago) || "",
        comprobante: comprobante?.trim() || "",
        total: parseFloat(total),
        tipoPago: parseInt(tipoPago, 10),
        fecha: fecha ? String(fecha) : "",
      },
      include: {
        tipoGasto: {
          select: { id: true, gasto: true },
        },
        privada: {
          select: { id: true, descripcion: true },
        },
      },
    });

    return NextResponse.json(gasto, { status: 201 });
  } catch (error) {
    console.error("Error al crear gasto:", error);
    return NextResponse.json(
      { error: "Error al crear gasto" },
      { status: 500 }
    );
  }
}
