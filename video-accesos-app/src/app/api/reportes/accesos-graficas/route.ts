import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Etiquetas para tipos de gestion
const TIPOS_GESTION_LABELS: Record<number, string> = {
  1: "No concluida",
  2: "Moroso",
  3: "Proveedor",
  4: "Residente",
  5: "Tecnico",
  6: "Trab. Obra",
  7: "Trab. Servicio",
  8: "Visita",
  9: "Visita Morosos",
};

const ESTATUS_LABELS: Record<number, string> = {
  1: "Acceso",
  2: "Rechazado",
  3: "Informo",
};

// GET /api/reportes/accesos-graficas - Datos agregados para graficas
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

    // Construir filtros
    const where: Record<string, unknown> = {};

    if (privadaId) {
      where.privadaId = parseInt(privadaId, 10);
    }

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

    // Ejecutar todas las agregaciones en paralelo
    const [
      porTipoGestionRaw,
      porEstatusRaw,
      total,
      registrosParaFechas,
      porPrivadaRaw,
    ] = await Promise.all([
      prisma.registroAcceso.groupBy({
        by: ["tipoGestionId"],
        where,
        _count: { id: true },
        orderBy: { tipoGestionId: "asc" },
      }),
      prisma.registroAcceso.groupBy({
        by: ["estatusId"],
        where,
        _count: { id: true },
        orderBy: { estatusId: "asc" },
      }),
      prisma.registroAcceso.count({ where }),
      prisma.registroAcceso.findMany({
        where,
        select: { fechaModificacion: true },
      }),
      // Agrupar por privada y tipo de gestion (para ranking de privadas)
      !privadaId
        ? prisma.registroAcceso.groupBy({
            by: ["privadaId", "tipoGestionId"],
            where,
            _count: { id: true },
          })
        : Promise.resolve([]),
    ]);

    // Transformar porTipoGestion
    const porTipoGestion = porTipoGestionRaw.map((item: { tipoGestionId: number; _count: { id: number } }) => ({
      tipoGestionId: item.tipoGestionId,
      label: TIPOS_GESTION_LABELS[item.tipoGestionId] || `Tipo ${item.tipoGestionId}`,
      count: item._count.id,
    }));

    // Transformar porEstatus
    const porEstatus = porEstatusRaw.map((item: { estatusId: number; _count: { id: number } }) => ({
      estatusId: item.estatusId,
      label: ESTATUS_LABELS[item.estatusId] || `Estatus ${item.estatusId}`,
      count: item._count.id,
    }));

    // Calcular porDia agrupando en JS (mas flexible que SQL raw)
    const conteosDia: Record<string, number> = {};
    const conteosHora: Record<number, number> = {};

    // Inicializar horas 0-23
    for (let h = 0; h < 24; h++) {
      conteosHora[h] = 0;
    }

    for (const reg of registrosParaFechas) {
      const d = new Date(reg.fechaModificacion);
      const fechaStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      conteosDia[fechaStr] = (conteosDia[fechaStr] || 0) + 1;
      conteosHora[d.getHours()] = (conteosHora[d.getHours()] || 0) + 1;
    }

    // Ordenar porDia por fecha
    const porDia = Object.entries(conteosDia)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([fecha, count]) => ({ fecha, count }));

    // Transformar porHora
    const porHora = Object.entries(conteosHora)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([hora, count]) => ({ hora: Number(hora), count }));

    // Construir ranking por privada (solo cuando no hay filtro de privada)
    let porPrivada: {
      privadaId: number;
      privadaNombre: string;
      total: number;
      porTipo: Record<number, number>;
    }[] = [];

    if (!privadaId && Array.isArray(porPrivadaRaw) && porPrivadaRaw.length > 0) {
      // Agrupar por privada
      const privadaMap: Record<number, { total: number; porTipo: Record<number, number> }> = {};
      for (const row of porPrivadaRaw as { privadaId: number; tipoGestionId: number; _count: { id: number } }[]) {
        if (!privadaMap[row.privadaId]) {
          privadaMap[row.privadaId] = { total: 0, porTipo: {} };
        }
        privadaMap[row.privadaId].total += row._count.id;
        privadaMap[row.privadaId].porTipo[row.tipoGestionId] = row._count.id;
      }

      // Obtener nombres de privadas
      const privadaIds = Object.keys(privadaMap).map(Number);
      const privadasInfo = await prisma.privada.findMany({
        where: { id: { in: privadaIds } },
        select: { id: true, descripcion: true },
      });
      const nombresMap: Record<number, string> = {};
      for (const p of privadasInfo) {
        nombresMap[p.id] = p.descripcion;
      }

      // Construir array ordenado por total desc
      porPrivada = Object.entries(privadaMap)
        .map(([pid, data]) => ({
          privadaId: Number(pid),
          privadaNombre: nombresMap[Number(pid)] || `Privada ${pid}`,
          total: data.total,
          porTipo: data.porTipo,
        }))
        .sort((a, b) => b.total - a.total);
    }

    return NextResponse.json({
      porTipoGestion,
      porEstatus,
      porDia,
      porHora,
      porPrivada,
      total,
    });
  } catch (error) {
    console.error("Error al obtener datos para graficas:", error);
    return NextResponse.json(
      { error: "Error al obtener datos para graficas" },
      { status: 500 }
    );
  }
}
