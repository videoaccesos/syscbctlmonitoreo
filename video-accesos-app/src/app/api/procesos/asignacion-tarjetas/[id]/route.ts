import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/procesos/asignacion-tarjetas/[id] - Obtener una asignacion por ID
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
    const asignacionId = parseInt(id, 10);

    if (isNaN(asignacionId)) {
      return NextResponse.json({ error: "ID invalido" }, { status: 400 });
    }

    const asignacion = await prisma.residenteTarjeta.findUnique({
      where: { id: asignacionId },
      include: {
        residente: {
          select: {
            id: true,
            nombre: true,
            apePaterno: true,
            apeMaterno: true,
            celular: true,
            email: true,
            residencia: {
              select: {
                id: true,
                nroCasa: true,
                calle: true,
                privada: {
                  select: {
                    id: true,
                    descripcion: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!asignacion) {
      return NextResponse.json(
        { error: "Asignacion no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json(asignacion);
  } catch (error) {
    console.error("Error al obtener asignacion:", error);
    return NextResponse.json(
      { error: "Error al obtener asignacion" },
      { status: 500 }
    );
  }
}

// PUT /api/procesos/asignacion-tarjetas/[id] - Actualizar asignacion
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
    const asignacionId = parseInt(id, 10);

    if (isNaN(asignacionId)) {
      return NextResponse.json({ error: "ID invalido" }, { status: 400 });
    }

    const existente = await prisma.residenteTarjeta.findUnique({
      where: { id: asignacionId },
    });

    if (!existente) {
      return NextResponse.json(
        { error: "Asignacion no encontrada" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const data: Record<string, unknown> = {};

    if (body.tarjetaId !== undefined) {
      data.tarjetaId = String(body.tarjetaId) || "";
    }
    if (body.tarjetaId2 !== undefined) {
      data.tarjetaId2 = String(body.tarjetaId2) || "";
    }
    if (body.tarjetaId3 !== undefined) {
      data.tarjetaId3 = String(body.tarjetaId3) || "";
    }
    if (body.tarjetaId4 !== undefined) {
      data.tarjetaId4 = String(body.tarjetaId4) || "";
    }
    if (body.tarjetaId5 !== undefined) {
      data.tarjetaId5 = String(body.tarjetaId5) || "";
    }
    if (body.fechaVencimiento !== undefined) {
      data.fechaVencimiento = body.fechaVencimiento
        ? new Date(body.fechaVencimiento)
        : new Date();
    }
    if (body.lecturaTipoId !== undefined) {
      data.lecturaTipoId = body.lecturaTipoId
        ? parseInt(body.lecturaTipoId, 10)
        : 0;
    }
    if (body.lecturaEpc !== undefined) {
      data.lecturaEpc = body.lecturaEpc?.trim() || "";
    }
    if (body.folioContrato !== undefined) {
      data.folioContrato = body.folioContrato?.trim() || "";
    }
    if (body.precio !== undefined) {
      data.precio = body.precio ? parseFloat(body.precio) : 0;
    }
    if (body.utilizoSeguro !== undefined) {
      data.utilizoSeguro = body.utilizoSeguro ? 1 : 0;
    }
    if (body.utilizoSeguro2 !== undefined) {
      data.utilizoSeguro2 = body.utilizoSeguro2 ? 1 : 0;
    }
    if (body.utilizoSeguro3 !== undefined) {
      data.utilizoSeguro3 = body.utilizoSeguro3 ? 1 : 0;
    }
    if (body.utilizoSeguro4 !== undefined) {
      data.utilizoSeguro4 = body.utilizoSeguro4 ? 1 : 0;
    }
    if (body.utilizoSeguro5 !== undefined) {
      data.utilizoSeguro5 = body.utilizoSeguro5 ? 1 : 0;
    }
    if (body.estatusId !== undefined) {
      data.estatusId = parseInt(body.estatusId, 10);
    }

    const asignacion = await prisma.residenteTarjeta.update({
      where: { id: asignacionId },
      data,
      include: {
        residente: {
          select: {
            id: true,
            nombre: true,
            apePaterno: true,
            apeMaterno: true,
            residencia: {
              select: {
                id: true,
                nroCasa: true,
                calle: true,
                privada: {
                  select: {
                    id: true,
                    descripcion: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return NextResponse.json(asignacion);
  } catch (error) {
    console.error("Error al actualizar asignacion:", error);
    return NextResponse.json(
      { error: "Error al actualizar asignacion" },
      { status: 500 }
    );
  }
}

// DELETE /api/procesos/asignacion-tarjetas/[id] - Cancelar asignacion (no elimina, cambia estatus)
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
    const asignacionId = parseInt(id, 10);

    if (isNaN(asignacionId)) {
      return NextResponse.json({ error: "ID invalido" }, { status: 400 });
    }

    const existente = await prisma.residenteTarjeta.findUnique({
      where: { id: asignacionId },
    });

    if (!existente) {
      return NextResponse.json(
        { error: "Asignacion no encontrada" },
        { status: 404 }
      );
    }

    if (existente.estatusId === 2) {
      return NextResponse.json(
        { error: "La asignacion ya esta cancelada" },
        { status: 400 }
      );
    }

    // Cancelar asignacion: cambiar estatus a 2 (Cancelada)
    await prisma.residenteTarjeta.update({
      where: { id: asignacionId },
      data: { estatusId: 2 },
    });

    return NextResponse.json({
      message: "Asignacion cancelada correctamente",
    });
  } catch (error) {
    console.error("Error al cancelar asignacion:", error);
    return NextResponse.json(
      { error: "Error al cancelar asignacion" },
      { status: 500 }
    );
  }
}
