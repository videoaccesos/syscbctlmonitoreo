import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/reportes/accesos-consultas - Consultar registros de acceso con filtros completos
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
    const tipoGestionId = searchParams.get("tipoGestionId");
    const estatusId = searchParams.get("estatusId");
    const empleadoId = searchParams.get("empleadoId");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const skip = (page - 1) * limit;

    // Construir filtros dinamicamente
    const where: Record<string, unknown> = {};

    if (privadaId) {
      where.privadaId = parseInt(privadaId, 10);
    }

    if (tipoGestionId) {
      where.tipoGestionId = parseInt(tipoGestionId, 10);
    }

    if (estatusId) {
      where.estatusId = parseInt(estatusId, 10);
    }

    if (empleadoId) {
      where.empleadoId = parseInt(empleadoId, 10);
    }

    // Filtro de fechas
    if (fechaDesde || fechaHasta) {
      const creadoEnFilter: Record<string, Date> = {};
      if (fechaDesde) {
        creadoEnFilter.gte = new Date(`${fechaDesde}T00:00:00`);
      }
      if (fechaHasta) {
        creadoEnFilter.lte = new Date(`${fechaHasta}T23:59:59`);
      }
      where.creadoEn = creadoEnFilter;
    } else {
      // Por defecto: mes actual
      const hoy = new Date();
      const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1, 0, 0, 0);
      const finMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0, 23, 59, 59);
      where.creadoEn = {
        gte: inicioMes,
        lte: finMes,
      };
    }

    const [registros, total] = await Promise.all([
      prisma.registroAcceso.findMany({
        where,
        include: {
          privada: {
            select: { id: true, descripcion: true },
          },
          residencia: {
            select: { id: true, nroCasa: true, calle: true },
          },
          empleado: {
            select: {
              id: true,
              nombre: true,
              apePaterno: true,
              apeMaterno: true,
              nroOperador: true,
            },
          },
          usuario: {
            select: {
              id: true,
              usuario: true,
              empleado: {
                select: {
                  nombre: true,
                  apePaterno: true,
                },
              },
            },
          },
        },
        orderBy: { creadoEn: "desc" },
        skip,
        take: limit,
      }),
      prisma.registroAcceso.count({ where }),
    ]);

    return NextResponse.json({
      data: registros,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error al consultar registros de acceso:", error);
    return NextResponse.json(
      { error: "Error al obtener registros de acceso" },
      { status: 500 }
    );
  }
}
