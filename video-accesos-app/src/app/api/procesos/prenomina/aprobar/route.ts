import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/procesos/prenomina/aprobar
// Body: { periodo, quincena, accion: "aprobar"|"pagar"|"cancelar" }
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { periodo, quincena, accion } = body;

    if (!periodo || !quincena || !accion) {
      return NextResponse.json(
        { error: "Campos requeridos: periodo, quincena, accion" },
        { status: 400 }
      );
    }

    const estatusMap: Record<string, { from: number; to: number; label: string }> = {
      aprobar: { from: 1, to: 2, label: "Aprobada" },
      pagar: { from: 2, to: 3, label: "Pagada" },
      cancelar: { from: 1, to: 4, label: "Cancelada" },
    };

    const config = estatusMap[accion];
    if (!config) {
      return NextResponse.json(
        { error: "Acción inválida. Use: aprobar, pagar, cancelar" },
        { status: 400 }
      );
    }

    const userId = Number((session.user as Record<string, unknown>)?.id || 0);

    const result = await prisma.$executeRawUnsafe(
      `UPDATE prenomina SET estatus_id = ?, fecha_modificacion = NOW(), usuario_mod_id = ?
       WHERE periodo = ? AND quincena = ? AND estatus_id = ?`,
      config.to, userId, periodo, Number(quincena), config.from
    );

    return NextResponse.json({
      message: `Prenomina ${config.label} masivamente`,
      registrosAfectados: result,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Error en acción masiva prenomina:", msg);
    return NextResponse.json({ error: `Error: ${msg}` }, { status: 500 });
  }
}
