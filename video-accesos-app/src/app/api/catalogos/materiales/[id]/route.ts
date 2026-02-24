import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/catalogos/materiales/[id] - Obtener un material por ID
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
    const materialId = parseInt(id, 10);

    if (isNaN(materialId)) {
      return NextResponse.json({ error: "ID invalido" }, { status: 400 });
    }

    const material = await prisma.material.findFirst({
      where: { id: materialId, estatusId: 1 },
    });

    if (!material) {
      return NextResponse.json(
        { error: "Material no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(material);
  } catch (error) {
    console.error("Error al obtener material:", error);
    return NextResponse.json(
      { error: "Error al obtener material" },
      { status: 500 }
    );
  }
}

// PUT /api/catalogos/materiales/[id] - Actualizar un material
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
    const materialId = parseInt(id, 10);

    if (isNaN(materialId)) {
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

    if (body.costo === undefined || body.costo === null) {
      return NextResponse.json(
        { error: "El costo es requerido" },
        { status: 400 }
      );
    }

    const costo = parseFloat(body.costo);
    if (isNaN(costo) || costo < 0) {
      return NextResponse.json(
        { error: "El costo debe ser un numero valido mayor o igual a 0" },
        { status: 400 }
      );
    }

    // Verificar que existe
    const existente = await prisma.material.findFirst({
      where: { id: materialId, estatusId: 1 },
    });

    if (!existente) {
      return NextResponse.json(
        { error: "Material no encontrado" },
        { status: 404 }
      );
    }

    // Verificar duplicado de codigo (excluyendo el registro actual)
    const duplicado = await prisma.material.findFirst({
      where: {
        codigo: body.codigo.trim(),
        estatusId: 1,
        NOT: { id: materialId },
      },
    });

    if (duplicado) {
      return NextResponse.json(
        { error: "Ya existe otro material con ese codigo" },
        { status: 409 }
      );
    }

    const material = await prisma.material.update({
      where: { id: materialId },
      data: {
        codigo: body.codigo.trim(),
        descripcion: body.descripcion.trim(),
        costo,
      },
    });

    return NextResponse.json(material);
  } catch (error) {
    console.error("Error al actualizar material:", error);
    return NextResponse.json(
      { error: "Error al actualizar material" },
      { status: 500 }
    );
  }
}

// DELETE /api/catalogos/materiales/[id] - Soft delete (estatusId = 2)
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
    const materialId = parseInt(id, 10);

    if (isNaN(materialId)) {
      return NextResponse.json({ error: "ID invalido" }, { status: 400 });
    }

    // Verificar que existe y esta activo
    const existente = await prisma.material.findFirst({
      where: { id: materialId, estatusId: 1 },
    });

    if (!existente) {
      return NextResponse.json(
        { error: "Material no encontrado" },
        { status: 404 }
      );
    }

    // Soft delete: cambiar estatus a 2 (Baja)
    await prisma.material.update({
      where: { id: materialId },
      data: { estatusId: 2 },
    });

    return NextResponse.json({ message: "Material eliminado correctamente" });
  } catch (error) {
    console.error("Error al eliminar material:", error);
    return NextResponse.json(
      { error: "Error al eliminar material" },
      { status: 500 }
    );
  }
}
