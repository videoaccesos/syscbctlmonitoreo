import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PUT /api/catalogos/residentes/[id] - Actualizar residente
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const { id } = await params;

    const existente = await prisma.residente.findUnique({
      where: { id },
    });
    if (!existente) {
      return NextResponse.json(
        { error: "Residente no encontrado" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const data: Record<string, unknown> = {};

    if (body.nombre !== undefined) data.nombre = body.nombre.trim();
    if (body.apePaterno !== undefined) data.apePaterno = body.apePaterno.trim();
    if (body.apeMaterno !== undefined) data.apeMaterno = body.apeMaterno.trim();
    if (body.celular !== undefined) data.celular = body.celular.trim();
    if (body.email !== undefined) data.email = body.email.trim();
    if (body.estatusId !== undefined)
      data.estatusId = parseInt(body.estatusId, 10);

    const residente = await prisma.residente.update({
      where: { id },
      data,
    });

    return NextResponse.json(residente);
  } catch (error) {
    console.error("Error al actualizar residente:", error);
    return NextResponse.json(
      { error: "Error al actualizar residente" },
      { status: 500 }
    );
  }
}

// DELETE /api/catalogos/residentes/[id] - Dar de baja residente (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const { id } = await params;

    const existente = await prisma.residente.findUnique({
      where: { id },
    });
    if (!existente) {
      return NextResponse.json(
        { error: "Residente no encontrado" },
        { status: 404 }
      );
    }

    await prisma.residente.update({
      where: { id },
      data: { estatusId: 2 },
    });

    return NextResponse.json({ message: "Residente dado de baja" });
  } catch (error) {
    console.error("Error al dar de baja residente:", error);
    return NextResponse.json(
      { error: "Error al dar de baja residente" },
      { status: 500 }
    );
  }
}
