import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/catalogos/empleados/[id] - Obtener un empleado por ID
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const empleadoId = parseInt(id, 10);

    if (isNaN(empleadoId)) {
      return NextResponse.json({ error: "ID invalido" }, { status: 400 });
    }

    const empleado = await prisma.empleado.findUnique({
      where: { id: empleadoId },
      include: { puesto: true },
    });

    if (!empleado) {
      return NextResponse.json(
        { error: "Empleado no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(empleado);
  } catch (error) {
    console.error("Error al obtener empleado:", error);
    return NextResponse.json(
      { error: "Error al obtener empleado" },
      { status: 500 }
    );
  }
}

// PUT /api/catalogos/empleados/[id] - Actualizar empleado
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
    const empleadoId = parseInt(id, 10);

    if (isNaN(empleadoId)) {
      return NextResponse.json({ error: "ID invalido" }, { status: 400 });
    }

    const body = await request.json();

    // Verificar que existe
    const existente = await prisma.empleado.findUnique({
      where: { id: empleadoId },
    });

    if (!existente) {
      return NextResponse.json(
        { error: "Empleado no encontrado" },
        { status: 404 }
      );
    }

    const { nombre, apePaterno, apeMaterno, puestoId } = body;
    if (
      !nombre?.trim() ||
      !apePaterno?.trim() ||
      !apeMaterno?.trim() ||
      !puestoId
    ) {
      return NextResponse.json(
        {
          error:
            "Nombre, apellido paterno, apellido materno y puesto son requeridos",
        },
        { status: 400 }
      );
    }

    const empleado = await prisma.empleado.update({
      where: { id: empleadoId },
      data: {
        nombre: nombre.trim(),
        apePaterno: apePaterno.trim(),
        apeMaterno: apeMaterno.trim(),
        nroSeguroSocial: body.nroSeguroSocial?.trim() || null,
        puestoId: parseInt(body.puestoId, 10),
        nroOperador: body.nroOperador?.trim() || null,
        calle: body.calle?.trim() || null,
        nroCasa: body.nroCasa?.trim() || null,
        sexo: body.sexo || null,
        colonia: body.colonia?.trim() || null,
        telefono: body.telefono?.trim() || null,
        celular: body.celular?.trim() || null,
        email: body.email?.trim() || null,
        fechaIngreso: body.fechaIngreso ? new Date(body.fechaIngreso) : null,
        permisoAdmin: body.permisoAdmin || false,
        permisoSupervisor: body.permisoSupervisor || false,
      },
      include: { puesto: true },
    });

    return NextResponse.json(empleado);
  } catch (error) {
    console.error("Error al actualizar empleado:", error);
    return NextResponse.json(
      { error: "Error al actualizar empleado" },
      { status: 500 }
    );
  }
}

// DELETE /api/catalogos/empleados/[id] - Baja logica (estatusId=2, fechaBaja=hoy)
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
    const empleadoId = parseInt(id, 10);

    if (isNaN(empleadoId)) {
      return NextResponse.json({ error: "ID invalido" }, { status: 400 });
    }

    // Verificar que existe y esta activo
    const existente = await prisma.empleado.findFirst({
      where: { id: empleadoId, estatusId: 1 },
    });

    if (!existente) {
      return NextResponse.json(
        { error: "Empleado no encontrado o ya dado de baja" },
        { status: 404 }
      );
    }

    // Soft delete: cambiar estatus a 2 (Baja) y registrar fecha de baja
    await prisma.empleado.update({
      where: { id: empleadoId },
      data: {
        estatusId: 2,
        fechaBaja: new Date(),
      },
    });

    return NextResponse.json({ message: "Empleado dado de baja correctamente" });
  } catch (error) {
    console.error("Error al dar de baja empleado:", error);
    return NextResponse.json(
      { error: "Error al dar de baja empleado" },
      { status: 500 }
    );
  }
}
