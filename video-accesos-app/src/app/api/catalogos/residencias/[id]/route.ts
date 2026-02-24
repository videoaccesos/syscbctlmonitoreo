import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/catalogos/residencias/[id] - Obtener residencia con residentes
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const residencia = await prisma.residencia.findUnique({
      where: { id: parseInt(id) },
      include: {
        privada: {
          select: { id: true, descripcion: true },
        },
        residentes: {
          where: { estatusId: 1 },
          orderBy: { apePaterno: "asc" },
        },
      },
    });

    if (!residencia) {
      return NextResponse.json(
        { error: "Residencia no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json(residencia);
  } catch (error) {
    console.error("Error al obtener residencia:", error);
    return NextResponse.json(
      { error: "Error al obtener residencia" },
      { status: 500 }
    );
  }
}

// PUT /api/catalogos/residencias/[id] - Actualizar residencia
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
    const body = await request.json();
    const {
      privadaId,
      nroCasa,
      calle,
      telefono1,
      telefono2,
      interfon,
      telefonoInterfon,
      observaciones,
      estatusId,
    } = body;

    if (!privadaId || !nroCasa || !calle) {
      return NextResponse.json(
        { error: "Privada, numero de casa y calle son requeridos" },
        { status: 400 }
      );
    }

    const existing = await prisma.residencia.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Residencia no encontrada" },
        { status: 404 }
      );
    }

    const residencia = await prisma.residencia.update({
      where: { id: parseInt(id) },
      data: {
        privadaId: parseInt(privadaId),
        nroCasa,
        calle,
        telefono1: telefono1 || null,
        telefono2: telefono2 || null,
        interfon: interfon || null,
        telefonoInterfon: telefonoInterfon || null,
        observaciones: observaciones || null,
        estatusId: estatusId ? parseInt(estatusId) : existing.estatusId,
      },
      include: {
        privada: {
          select: { id: true, descripcion: true },
        },
      },
    });

    return NextResponse.json(residencia);
  } catch (error) {
    console.error("Error al actualizar residencia:", error);
    return NextResponse.json(
      { error: "Error al actualizar residencia" },
      { status: 500 }
    );
  }
}

// DELETE /api/catalogos/residencias/[id] - Eliminar residencia (soft delete)
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
    const existing = await prisma.residencia.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Residencia no encontrada" },
        { status: 404 }
      );
    }

    await prisma.residencia.update({
      where: { id: parseInt(id) },
      data: { estatusId: 2 },
    });

    return NextResponse.json({ message: "Residencia eliminada correctamente" });
  } catch (error) {
    console.error("Error al eliminar residencia:", error);
    return NextResponse.json(
      { error: "Error al eliminar residencia" },
      { status: 500 }
    );
  }
}
