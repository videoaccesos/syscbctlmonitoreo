import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/catalogos/tarjetas/[id] - Obtener una tarjeta por ID
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
    const tarjetaId = parseInt(id, 10);

    if (isNaN(tarjetaId)) {
      return NextResponse.json({ error: "ID invalido" }, { status: 400 });
    }

    const tarjeta = await prisma.tarjeta.findUnique({
      where: { id: tarjetaId },
    });

    if (!tarjeta) {
      return NextResponse.json(
        { error: "Tarjeta no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json(tarjeta);
  } catch (error) {
    console.error("Error al obtener tarjeta:", error);
    return NextResponse.json(
      { error: "Error al obtener tarjeta" },
      { status: 500 }
    );
  }
}

// PUT /api/catalogos/tarjetas/[id] - Actualizar una tarjeta
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
    const tarjetaId = parseInt(id, 10);

    if (isNaN(tarjetaId)) {
      return NextResponse.json({ error: "ID invalido" }, { status: 400 });
    }

    const body = await request.json();

    // Validacion basica
    if (!body.lectura || body.lectura.trim() === "") {
      return NextResponse.json(
        { error: "La lectura es requerida" },
        { status: 400 }
      );
    }

    if (!body.tipoId) {
      return NextResponse.json(
        { error: "El tipo es requerido (1=Peatonal, 2=Vehicular)" },
        { status: 400 }
      );
    }

    const tipoId = parseInt(body.tipoId, 10);
    if (![1, 2].includes(tipoId)) {
      return NextResponse.json(
        { error: "El tipo debe ser 1 (Peatonal) o 2 (Vehicular)" },
        { status: 400 }
      );
    }

    if (body.estatusId) {
      const estatusId = parseInt(body.estatusId, 10);
      if (![1, 2, 3, 4, 5].includes(estatusId)) {
        return NextResponse.json(
          { error: "El estatus debe ser 1 (Activa), 2 (Asignada), 3 (Danada), 4 (Consignacion) o 5 (Baja)" },
          { status: 400 }
        );
      }
    }

    // Verificar que existe
    const existente = await prisma.tarjeta.findUnique({
      where: { id: tarjetaId },
    });

    if (!existente) {
      return NextResponse.json(
        { error: "Tarjeta no encontrada" },
        { status: 404 }
      );
    }

    // Verificar duplicado de lectura (excluyendo el registro actual)
    const duplicado = await prisma.tarjeta.findFirst({
      where: {
        lectura: body.lectura.trim(),
        NOT: { id: tarjetaId },
      },
    });

    if (duplicado) {
      return NextResponse.json(
        { error: "Ya existe otra tarjeta con esa lectura" },
        { status: 409 }
      );
    }

    const tarjeta = await prisma.tarjeta.update({
      where: { id: tarjetaId },
      data: {
        lectura: body.lectura.trim(),
        tipoId,
        ...(body.estatusId !== undefined && {
          estatusId: parseInt(body.estatusId, 10),
        }),
        ...(body.fecha !== undefined && {
          fecha: new Date(body.fecha),
        }),
      },
    });

    return NextResponse.json(tarjeta);
  } catch (error) {
    console.error("Error al actualizar tarjeta:", error);
    return NextResponse.json(
      { error: "Error al actualizar tarjeta" },
      { status: 500 }
    );
  }
}

// DELETE /api/catalogos/tarjetas/[id] - Cambiar estatus de tarjeta
// No es soft delete tradicional; cambia el estatus segun el valor proporcionado
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
    const tarjetaId = parseInt(id, 10);

    if (isNaN(tarjetaId)) {
      return NextResponse.json({ error: "ID invalido" }, { status: 400 });
    }

    // Verificar que existe
    const existente = await prisma.tarjeta.findUnique({
      where: { id: tarjetaId },
    });

    if (!existente) {
      return NextResponse.json(
        { error: "Tarjeta no encontrada" },
        { status: 404 }
      );
    }

    // Cambiar estatus a 5 (Baja)
    await prisma.tarjeta.update({
      where: { id: tarjetaId },
      data: { estatusId: 5 },
    });

    return NextResponse.json({ message: "Tarjeta dada de baja correctamente" });
  } catch (error) {
    console.error("Error al dar de baja tarjeta:", error);
    return NextResponse.json(
      { error: "Error al dar de baja tarjeta" },
      { status: 500 }
    );
  }
}
