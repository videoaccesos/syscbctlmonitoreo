import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PUT /api/catalogos/cuentas-gasto/[id]
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
    const cuentaId = parseInt(id, 10);
    if (isNaN(cuentaId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const existente = await prisma.cuentaGasto.findUnique({ where: { id: cuentaId } });
    if (!existente) {
      return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });
    }

    const body = await request.json();
    const { clave, descripcion } = body;

    if (!clave?.trim() || !descripcion?.trim()) {
      return NextResponse.json({ error: "Clave y descripción son requeridos" }, { status: 400 });
    }

    // Verificar duplicado de clave (excluyendo el actual)
    const dup = await prisma.cuentaGasto.findFirst({
      where: { clave: clave.trim(), estatusId: 1, id: { not: cuentaId } },
    });
    if (dup) {
      return NextResponse.json({ error: `Ya existe otra cuenta con clave "${clave}"` }, { status: 409 });
    }

    const cuenta = await prisma.cuentaGasto.update({
      where: { id: cuentaId },
      data: { clave: clave.trim(), descripcion: descripcion.trim() },
    });

    return NextResponse.json(cuenta);
  } catch (error) {
    console.error("Error al actualizar cuenta de gasto:", error);
    return NextResponse.json({ error: "Error al actualizar" }, { status: 500 });
  }
}

// DELETE /api/catalogos/cuentas-gasto/[id] — Baja lógica
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const cuentaId = parseInt(id, 10);
    if (isNaN(cuentaId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const existente = await prisma.cuentaGasto.findFirst({
      where: { id: cuentaId, estatusId: 1 },
    });
    if (!existente) {
      return NextResponse.json({ error: "Cuenta no encontrada o ya dada de baja" }, { status: 404 });
    }

    await prisma.cuentaGasto.update({
      where: { id: cuentaId },
      data: { estatusId: 2 },
    });

    return NextResponse.json({ message: "Cuenta de gasto dada de baja" });
  } catch (error) {
    console.error("Error al eliminar cuenta de gasto:", error);
    return NextResponse.json({ error: "Error al eliminar" }, { status: 500 });
  }
}
