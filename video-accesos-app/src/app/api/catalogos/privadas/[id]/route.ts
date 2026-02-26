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
      where: { id: privadaId, estatusId: { not: 4 } },
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
      where: { id: privadaId, estatusId: { not: 4 } },
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
        apePaterno: body.apePaterno?.trim() || "",
        apeMaterno: body.apeMaterno?.trim() || "",
        nombre: body.nombre?.trim() || "",
        tipoContactoId: body.tipoContactoId
          ? parseInt(body.tipoContactoId, 10)
          : 0,
        telefono: body.telefono?.trim() || "",
        celular: body.celular?.trim() || "",
        email: body.email?.trim() || "",
        historial: body.historial?.trim() || "",
        dns1: body.dns1?.trim() || "",
        puerto1: body.puerto1?.trim() || "",
        alias1: body.alias1?.trim() || "",
        tipoTarjeta1: body.tipoTarjeta1?.trim() || "",
        contrasena1: body.contrasena1?.trim() || "",
        dns2: body.dns2?.trim() || "",
        puerto2: body.puerto2?.trim() || "",
        alias2: body.alias2?.trim() || "",
        tipoTarjeta2: body.tipoTarjeta2?.trim() || "",
        contrasena2: body.contrasena2?.trim() || "",
        dns3: body.dns3?.trim() || "",
        puerto3: body.puerto3?.trim() || "",
        alias3: body.alias3?.trim() || "",
        tipoTarjeta3: body.tipoTarjeta3?.trim() || "",
        contrasena3: body.contrasena3?.trim() || "",
        video1: body.video1?.trim() || "",
        aliasVideo1: body.aliasVideo1?.trim() || "",
        video2: body.video2?.trim() || "",
        aliasVideo2: body.aliasVideo2?.trim() || "",
        video3: body.video3?.trim() || "",
        aliasVideo3: body.aliasVideo3?.trim() || "",
        precioVehicular: parseInt(body.precioVehicular, 10) || 0,
        precioPeatonal: parseInt(body.precioPeatonal, 10) || 0,
        precioMensualidad: parseInt(body.precioMensualidad, 10) || 0,
        venceContrato: body.venceContrato ? new Date(body.venceContrato) : null,
        observaciones: body.observaciones?.trim() || "",
        ...(body.estatusId ? { estatusId: parseInt(body.estatusId, 10) } : {}),
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
      where: { id: privadaId, estatusId: { not: 4 } },
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
