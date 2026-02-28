import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/dashboard - Obtener estadisticas para el dashboard
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const hoy = new Date();
    const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 0, 0, 0);
    const finHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 23, 59, 59);

    const [accesosHoy, privadasActivas, totalResidencias, ultimosAccesos] = await Promise.all([
      // Total de accesos hoy
      prisma.registroAcceso.count({
        where: {
          fechaModificacion: { gte: inicioHoy, lte: finHoy },
        },
      }),
      // Privadas activas
      prisma.privada.count({
        where: { estatusId: 1 },
      }),
      // Total de residencias activas
      prisma.residencia.count({
        where: { estatusId: { in: [1, 2, 3] } },
      }),
      // Ultimos 10 accesos
      prisma.registroAcceso.findMany({
        where: {
          fechaModificacion: { gte: inicioHoy, lte: finHoy },
        },
        include: {
          privada: { select: { descripcion: true } },
          residencia: { select: { nroCasa: true, calle: true } },
          empleado: { select: { nombre: true, apePaterno: true } },
        },
        orderBy: { fechaModificacion: "desc" },
        take: 10,
      }),
    ]);

    // Conteo por estatus hoy
    const [accesos, rechazos, informes] = await Promise.all([
      prisma.registroAcceso.count({
        where: {
          fechaModificacion: { gte: inicioHoy, lte: finHoy },
          estatusId: 1,
        },
      }),
      prisma.registroAcceso.count({
        where: {
          fechaModificacion: { gte: inicioHoy, lte: finHoy },
          estatusId: 2,
        },
      }),
      prisma.registroAcceso.count({
        where: {
          fechaModificacion: { gte: inicioHoy, lte: finHoy },
          estatusId: 3,
        },
      }),
    ]);

    return NextResponse.json({
      accesosHoy,
      privadasActivas,
      totalResidencias,
      desglose: { accesos, rechazos, informes },
      ultimosAccesos,
    });
  } catch (error) {
    console.error("Error al obtener estadisticas:", error);
    return NextResponse.json(
      { error: "Error al obtener estadisticas" },
      { status: 500 }
    );
  }
}
