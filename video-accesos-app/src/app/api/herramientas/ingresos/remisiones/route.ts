import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/herramientas/ingresos/remisiones?fechaIni=&fechaFin=
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const fechaIni = searchParams.get("fechaIni");
    const fechaFin = searchParams.get("fechaFin");

    const where: Record<string, unknown> = { estatusId: 1 };
    if (fechaIni && fechaFin) {
      where.fecha = { gte: fechaIni, lte: fechaFin };
    }

    const remisiones = await prisma.folioRemision.findMany({
      where,
      orderBy: { fecha: "desc" },
    });

    return NextResponse.json({ data: remisiones });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Error al listar remisiones:", msg);
    return NextResponse.json({ error: `Error: ${msg}` }, { status: 500 });
  }
}

// POST /api/herramientas/ingresos/remisiones
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();

    if (!body.concepto || !body.total || !body.fecha) {
      return NextResponse.json(
        { error: "Campos requeridos: concepto, total, fecha" },
        { status: 400 }
      );
    }

    const remision = await prisma.folioRemision.create({
      data: {
        concepto: body.concepto.trim(),
        descripcion: body.descripcion?.trim() || "",
        total: parseFloat(body.total),
        tipoPago: parseInt(body.tipoPago, 10) || 1,
        fecha: body.fecha,
        observaciones: body.observaciones?.trim() || "",
        estatusId: 1,
        usuarioModId: 0,
      },
    });

    return NextResponse.json(remision, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Error al crear remision:", msg);
    return NextResponse.json({ error: `Error: ${msg}` }, { status: 500 });
  }
}

// DELETE /api/herramientas/ingresos/remisiones?id=X (soft delete)
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = parseInt(searchParams.get("id") || "", 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: "ID invalido" }, { status: 400 });
    }

    await prisma.folioRemision.update({
      where: { id },
      data: { estatusId: 2 },
    });

    return NextResponse.json({ message: "Remision cancelada" });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Error al cancelar remision:", msg);
    return NextResponse.json({ error: `Error: ${msg}` }, { status: 500 });
  }
}
