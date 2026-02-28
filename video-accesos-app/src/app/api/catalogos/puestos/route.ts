import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/catalogos/puestos - Listar todos los puestos activos
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const puestos = await prisma.puesto.findMany({
      where: { estatusId: 1 },
      orderBy: { descripcion: "asc" },
    });

    return NextResponse.json(puestos);
  } catch (error) {
    console.error("Error al obtener puestos:", error);
    return NextResponse.json(
      { error: "Error al obtener puestos" },
      { status: 500 }
    );
  }
}

// POST /api/catalogos/puestos - Crear un puesto
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { descripcion } = body;

    if (!descripcion || !descripcion.trim()) {
      return NextResponse.json(
        { error: "La descripcion es requerida" },
        { status: 400 }
      );
    }

    const existente = await prisma.puesto.findFirst({
      where: { descripcion: descripcion.trim(), estatusId: 1 },
    });

    if (existente) {
      return NextResponse.json(
        { error: "Ya existe un puesto con esa descripcion" },
        { status: 409 }
      );
    }

    const puesto = await prisma.puesto.create({
      data: { descripcion: descripcion.trim(), usuarioModId: 0 },
    });

    return NextResponse.json(puesto, { status: 201 });
  } catch (error) {
    console.error("Error al crear puesto:", error);
    return NextResponse.json(
      { error: "Error al crear puesto" },
      { status: 500 }
    );
  }
}
