import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/catalogos/puestos/[id] - Obtener un puesto por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const puestoId = parseInt(id, 10);

    if (isNaN(puestoId)) {
      return NextResponse.json({ error: "ID invalido" }, { status: 400 });
    }

    const puesto = await prisma.puesto.findFirst({
      where: { id: puestoId, estatusId: 1 },
    });

    if (!puesto) {
      return NextResponse.json(
        { error: "Puesto no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(puesto);
  } catch (error) {
    console.error("Error al obtener puesto:", error);
    return NextResponse.json(
      { error: "Error al obtener puesto" },
      { status: 500 }
    );
  }
}

// PUT /api/catalogos/puestos/[id] - Actualizar un puesto
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const puestoId = parseInt(id, 10);

    if (isNaN(puestoId)) {
      return NextResponse.json({ error: "ID invalido" }, { status: 400 });
    }

    const body = await request.json();

    if (!body.descripcion || body.descripcion.trim() === "") {
      return NextResponse.json(
        { error: "La descripcion es requerida" },
        { status: 400 }
      );
    }

    // Verificar que existe
    const existente = await prisma.puesto.findFirst({
      where: { id: puestoId, estatusId: 1 },
    });

    if (!existente) {
      return NextResponse.json(
        { error: "Puesto no encontrado" },
        { status: 404 }
      );
    }

    // Verificar duplicado de descripcion (excluyendo el registro actual)
    const duplicado = await prisma.puesto.findFirst({
      where: {
        descripcion: body.descripcion.trim(),
        estatusId: 1,
        NOT: { id: puestoId },
      },
    });

    if (duplicado) {
      return NextResponse.json(
        { error: "Ya existe otro puesto con esa descripcion" },
        { status: 409 }
      );
    }

    const puesto = await prisma.puesto.update({
      where: { id: puestoId },
      data: {
        descripcion: body.descripcion.trim(),
      },
    });

    return NextResponse.json(puesto);
  } catch (error) {
    console.error("Error al actualizar puesto:", error);
    return NextResponse.json(
      { error: "Error al actualizar puesto" },
      { status: 500 }
    );
  }
}

// DELETE /api/catalogos/puestos/[id] - Soft delete (estatusId = 2)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const puestoId = parseInt(id, 10);

    if (isNaN(puestoId)) {
      return NextResponse.json({ error: "ID invalido" }, { status: 400 });
    }

    // Verificar que existe y esta activo
    const existente = await prisma.puesto.findFirst({
      where: { id: puestoId, estatusId: 1 },
    });

    if (!existente) {
      return NextResponse.json(
        { error: "Puesto no encontrado" },
        { status: 404 }
      );
    }

    // Soft delete: cambiar estatus a 2 (Baja)
    await prisma.puesto.update({
      where: { id: puestoId },
      data: { estatusId: 2 },
    });

    return NextResponse.json({ message: "Puesto eliminado correctamente" });
  } catch (error) {
    console.error("Error al eliminar puesto:", error);
    return NextResponse.json(
      { error: "Error al eliminar puesto" },
      { status: 500 }
    );
  }
}
