import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/catalogos/privadas/[id] - Obtener una privada por ID
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
    const privadaId = parseInt(id, 10);

    if (isNaN(privadaId)) {
      return NextResponse.json({ error: "ID invalido" }, { status: 400 });
    }

    const privada = await prisma.privada.findFirst({
      where: { id: privadaId, estatusId: 1 },
    });

    if (!privada) {
      return NextResponse.json(
        { error: "Privada no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json(privada);
  } catch (error) {
    console.error("Error al obtener privada:", error);
    return NextResponse.json(
      { error: "Error al obtener privada" },
      { status: 500 }
    );
  }
}

// PUT /api/catalogos/privadas/[id] - Actualizar una privada
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
    const privadaId = parseInt(id, 10);

    if (isNaN(privadaId)) {
      return NextResponse.json({ error: "ID invalido" }, { status: 400 });
    }

    const body = await request.json();

    // Validacion basica
    if (!body.descripcion || body.descripcion.trim() === "") {
      return NextResponse.json(
        { error: "La descripcion es requerida" },
        { status: 400 }
      );
    }

    // Verificar que existe
    const existente = await prisma.privada.findFirst({
      where: { id: privadaId, estatusId: 1 },
    });

    if (!existente) {
      return NextResponse.json(
        { error: "Privada no encontrada" },
        { status: 404 }
      );
    }

    // Verificar duplicado de descripcion (excluyendo el registro actual)
    const duplicado = await prisma.privada.findFirst({
      where: {
        descripcion: body.descripcion.trim(),
        estatusId: 1,
        NOT: { id: privadaId },
      },
    });

    if (duplicado) {
      return NextResponse.json(
        { error: "Ya existe otra privada con esa descripcion" },
        { status: 409 }
      );
    }

    const privada = await prisma.privada.update({
      where: { id: privadaId },
      data: {
        descripcion: body.descripcion.trim(),
        apePaterno: body.apePaterno?.trim() || null,
        apeMaterno: body.apeMaterno?.trim() || null,
        nombre: body.nombre?.trim() || null,
        tipoContactoId: body.tipoContactoId
          ? parseInt(body.tipoContactoId, 10)
          : null,
        telefono: body.telefono?.trim() || null,
        celular: body.celular?.trim() || null,
        email: body.email?.trim() || null,
        historial: body.historial?.trim() || null,
        precioVehicular: body.precioVehicular
          ? parseFloat(body.precioVehicular)
          : null,
        precioPeatonal: body.precioPeatonal
          ? parseFloat(body.precioPeatonal)
          : null,
        mensualidad: body.mensualidad ? parseFloat(body.mensualidad) : null,
        venceContrato: body.venceContrato
          ? new Date(body.venceContrato)
          : null,
        observaciones: body.observaciones?.trim() || null,
      },
    });

    return NextResponse.json(privada);
  } catch (error) {
    console.error("Error al actualizar privada:", error);
    return NextResponse.json(
      { error: "Error al actualizar privada" },
      { status: 500 }
    );
  }
}

// DELETE /api/catalogos/privadas/[id] - Soft delete (estatusId = 2)
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
    const privadaId = parseInt(id, 10);

    if (isNaN(privadaId)) {
      return NextResponse.json({ error: "ID invalido" }, { status: 400 });
    }

    // Verificar que existe y esta activa
    const existente = await prisma.privada.findFirst({
      where: { id: privadaId, estatusId: 1 },
    });

    if (!existente) {
      return NextResponse.json(
        { error: "Privada no encontrada" },
        { status: 404 }
      );
    }

    // Soft delete: cambiar estatus a 2 (Baja)
    await prisma.privada.update({
      where: { id: privadaId },
      data: { estatusId: 2 },
    });

    return NextResponse.json({ message: "Privada eliminada correctamente" });
  } catch (error) {
    console.error("Error al eliminar privada:", error);
    return NextResponse.json(
      { error: "Error al eliminar privada" },
      { status: 500 }
    );
  }
}
