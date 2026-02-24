import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/catalogos/turnos/[id] - Obtener un turno por ID
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
    const turnoId = parseInt(id, 10);

    if (isNaN(turnoId)) {
      return NextResponse.json({ error: "ID invalido" }, { status: 400 });
    }

    const turno = await prisma.turno.findFirst({
      where: { id: turnoId, estatusId: 1 },
    });

    if (!turno) {
      return NextResponse.json(
        { error: "Turno no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(turno);
  } catch (error) {
    console.error("Error al obtener turno:", error);
    return NextResponse.json(
      { error: "Error al obtener turno" },
      { status: 500 }
    );
  }
}

// PUT /api/catalogos/turnos/[id] - Actualizar un turno
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
    const turnoId = parseInt(id, 10);

    if (isNaN(turnoId)) {
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
    const existente = await prisma.turno.findFirst({
      where: { id: turnoId, estatusId: 1 },
    });

    if (!existente) {
      return NextResponse.json(
        { error: "Turno no encontrado" },
        { status: 404 }
      );
    }

    // Verificar duplicado de descripcion (excluyendo el registro actual)
    const duplicado = await prisma.turno.findFirst({
      where: {
        descripcion: body.descripcion.trim(),
        estatusId: 1,
        NOT: { id: turnoId },
      },
    });

    if (duplicado) {
      return NextResponse.json(
        { error: "Ya existe otro turno con esa descripcion" },
        { status: 409 }
      );
    }

    const turno = await prisma.turno.update({
      where: { id: turnoId },
      data: {
        descripcion: body.descripcion.trim(),
        puestoId: body.puestoId ? parseInt(body.puestoId, 10) : null,
      },
    });

    return NextResponse.json(turno);
  } catch (error) {
    console.error("Error al actualizar turno:", error);
    return NextResponse.json(
      { error: "Error al actualizar turno" },
      { status: 500 }
    );
  }
}

// DELETE /api/catalogos/turnos/[id] - Soft delete (estatusId = 2)
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
    const turnoId = parseInt(id, 10);

    if (isNaN(turnoId)) {
      return NextResponse.json({ error: "ID invalido" }, { status: 400 });
    }

    // Verificar que existe y esta activo
    const existente = await prisma.turno.findFirst({
      where: { id: turnoId, estatusId: 1 },
    });

    if (!existente) {
      return NextResponse.json(
        { error: "Turno no encontrado" },
        { status: 404 }
      );
    }

    // Soft delete: cambiar estatus a 2 (Baja)
    await prisma.turno.update({
      where: { id: turnoId },
      data: { estatusId: 2 },
    });

    return NextResponse.json({ message: "Turno eliminado correctamente" });
  } catch (error) {
    console.error("Error al eliminar turno:", error);
    return NextResponse.json(
      { error: "Error al eliminar turno" },
      { status: 500 }
    );
  }
}
