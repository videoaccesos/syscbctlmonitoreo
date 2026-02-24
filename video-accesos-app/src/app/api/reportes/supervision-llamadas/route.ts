import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/reportes/supervision-llamadas - Listar registros de supervision con filtros
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const fechaDesde = searchParams.get("fechaDesde");
    const fechaHasta = searchParams.get("fechaHasta");
    const supervisorId = searchParams.get("supervisorId");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const skip = (page - 1) * limit;

    // Construir filtros
    const where: Record<string, unknown> = {};

    if (supervisorId) {
      where.supervisorId = parseInt(supervisorId, 10);
    }

    // Filtro de fechas
    if (fechaDesde || fechaHasta) {
      const fechaFilter: Record<string, Date> = {};
      if (fechaDesde) {
        fechaFilter.gte = new Date(`${fechaDesde}T00:00:00`);
      }
      if (fechaHasta) {
        fechaFilter.lte = new Date(`${fechaHasta}T23:59:59`);
      }
      where.fecha = fechaFilter;
    } else {
      // Por defecto: mes actual
      const hoy = new Date();
      const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1, 0, 0, 0);
      const finMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0, 23, 59, 59);
      where.fecha = {
        gte: inicioMes,
        lte: finMes,
      };
    }

    const [supervisiones, total] = await Promise.all([
      prisma.supervisionLlamada.findMany({
        where,
        include: {
          registroAcceso: {
            include: {
              privada: {
                select: { id: true, descripcion: true },
              },
              residencia: {
                select: { id: true, nroCasa: true, calle: true },
              },
            },
          },
        },
        orderBy: { fecha: "desc" },
        skip,
        take: limit,
      }),
      prisma.supervisionLlamada.count({ where }),
    ]);

    // Obtener info de supervisores (empleados)
    const supervisorIds = [...new Set(supervisiones.map((s) => s.supervisorId))];
    const supervisores = supervisorIds.length > 0
      ? await prisma.empleado.findMany({
          where: { id: { in: supervisorIds } },
          select: {
            id: true,
            nombre: true,
            apePaterno: true,
            apeMaterno: true,
          },
        })
      : [];

    const supervisorMap: Record<number, string> = {};
    for (const sup of supervisores) {
      supervisorMap[sup.id] = `${sup.nombre} ${sup.apePaterno} ${sup.apeMaterno}`.trim();
    }

    // Enriquecer datos con nombre de supervisor
    const data = supervisiones.map((s) => ({
      ...s,
      supervisorNombre: supervisorMap[s.supervisorId] || `ID: ${s.supervisorId}`,
    }));

    return NextResponse.json({
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error al consultar supervision de llamadas:", error);
    return NextResponse.json(
      { error: "Error al obtener supervision de llamadas" },
      { status: 500 }
    );
  }
}
