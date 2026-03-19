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
    const nroCasa = searchParams.get("nroCasa");
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

    if (nroCasa) {
      where.residencia = { nroCasa: nroCasa };
    }

    // Filtro de fechas (usando fechaModificacion en lugar de creadoEn)
    if (fechaDesde || fechaHasta) {
      const fechaModificacionFilter: Record<string, Date> = {};
      if (fechaDesde) {
        fechaModificacionFilter.gte = new Date(`${fechaDesde}T00:00:00`);
      }
      if (fechaHasta) {
        fechaModificacionFilter.lte = new Date(`${fechaHasta}T23:59:59`);
      }
      where.fechaModificacion = fechaModificacionFilter;
    } else {
      // Por defecto: mes actual
      const hoy = new Date();
      const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1, 0, 0, 0);
      const finMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0, 23, 59, 59);
      where.fechaModificacion = {
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
        },
        orderBy: { fechaModificacion: "desc" },
        skip,
        take: limit,
      }),
      prisma.registroAcceso.count({ where }),
    ]);

    // Resolver nombres de solicitantes buscando en 3 tablas: residentes, visitantes, registros generales
    const solicitanteIds = [
      ...new Set(registros.map((r) => r.solicitanteId).filter(Boolean)),
    ];
    const nombres: Record<string, string> = {};

    if (solicitanteIds.length > 0) {
      // 1. Buscar en residentes
      const residentes = await prisma.residente.findMany({
        where: { id: { in: solicitanteIds } },
        select: { id: true, nombre: true, apePaterno: true, apeMaterno: true },
      });
      for (const r of residentes) {
        nombres[r.id] = `${r.nombre} ${r.apePaterno} ${r.apeMaterno}`.trim();
      }

      // 2. IDs no encontrados → buscar en visitantes
      const remaining1 = solicitanteIds.filter((id) => !nombres[id]);
      if (remaining1.length > 0) {
        const visitantes = await prisma.visita.findMany({
          where: { id: { in: remaining1 } },
          select: { id: true, nombre: true, apePaterno: true, apeMaterno: true },
        });
        for (const v of visitantes) {
          nombres[v.id] = `${v.nombre} ${v.apePaterno} ${v.apeMaterno}`.trim();
        }
      }

      // 3. IDs restantes → buscar en registros generales
      const remaining2 = solicitanteIds.filter((id) => !nombres[id]);
      if (remaining2.length > 0) {
        try {
          const generales = await prisma.registroGeneral.findMany({
            where: { id: { in: remaining2 } },
            select: { id: true, nombre: true, apePaterno: true, apeMaterno: true },
          });
          for (const g of generales) {
            nombres[g.id] = `${g.nombre} ${g.apePaterno} ${g.apeMaterno}`.trim();
          }
        } catch {
          // La tabla registros_generales puede no existir
        }
      }
    }

    const data = registros.map((r) => ({
      ...r,
      solicitanteNombre: nombres[r.solicitanteId] || r.solicitanteId,
    }));

    return NextResponse.json({
      data,
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
