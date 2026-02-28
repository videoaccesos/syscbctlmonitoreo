import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/catalogos/fallas/[id] - Obtener una falla por ID
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
    const fallaId = parseInt(id, 10);

    if (isNaN(fallaId)) {
      return NextResponse.json({ error: "ID invalido" }, { status: 400 });
    }

    const falla = await prisma.falla.findFirst({
      where: { id: fallaId, estatusId: 1 },
    });

    if (!falla) {
      return NextResponse.json(
        { error: "Falla no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json(falla);
  } catch (error) {
    console.error("Error al obtener falla:", error);
    return NextResponse.json(
      { error: "Error al obtener falla" },
      { status: 500 }
    );
  }
}

// PUT /api/catalogos/fallas/[id] - Actualizar una falla
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
    const fallaId = parseInt(id, 10);

    if (isNaN(fallaId)) {
      return NextResponse.json({ error: "ID invalido" }, { status: 400 });
    }

    const body = await request.json();

    // Validacion basica
    if (!body.codigo || body.codigo.trim() === "") {
      return NextResponse.json(
        { error: "El codigo es requerido" },
        { status: 400 }
      );
    }

    if (!body.descripcion || body.descripcion.trim() === "") {
      return NextResponse.json(
        { error: "La descripcion es requerida" },
        { status: 400 }
      );
    }

    // Verificar que existe
    const existente = await prisma.falla.findFirst({
      where: { id: fallaId, estatusId: 1 },
    });

    if (!existente) {
      return NextResponse.json(
        { error: "Falla no encontrada" },
        { status: 404 }
      );
    }

    // Verificar duplicado de codigo (excluyendo el registro actual)
    const duplicado = await prisma.falla.findFirst({
      where: {
        codigo: body.codigo.trim(),
        estatusId: 1,
        NOT: { id: fallaId },
      },
    });

    if (duplicado) {
      return NextResponse.json(
        { error: "Ya existe otra falla con ese codigo" },
        { status: 409 }
      );
    }

    const falla = await prisma.falla.update({
      where: { id: fallaId },
      data: {
        codigo: body.codigo.trim(),
        descripcion: body.descripcion.trim(),
      },
    });

    return NextResponse.json(falla);
  } catch (error) {
    console.error("Error al actualizar falla:", error);
    return NextResponse.json(
      { error: "Error al actualizar falla" },
      { status: 500 }
    );
  }
}

// DELETE /api/catalogos/fallas/[id] - Soft delete (estatusId = 2)
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
    const fallaId = parseInt(id, 10);

    if (isNaN(fallaId)) {
      return NextResponse.json({ error: "ID invalido" }, { status: 400 });
    }

    // Verificar que existe y esta activa
    const existente = await prisma.falla.findFirst({
      where: { id: fallaId, estatusId: 1 },
    });

    if (!existente) {
      return NextResponse.json(
        { error: "Falla no encontrada" },
        { status: 404 }
      );
    }

    // Soft delete: cambiar estatus a 2 (Baja)
    await prisma.falla.update({
      where: { id: fallaId },
      data: { estatusId: 2 },
    });

    return NextResponse.json({ message: "Falla eliminada correctamente" });
  } catch (error) {
    console.error("Error al eliminar falla:", error);
    return NextResponse.json(
      { error: "Error al eliminar falla" },
      { status: 500 }
    );
  }
}
