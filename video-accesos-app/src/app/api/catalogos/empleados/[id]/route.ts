import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma, fixZeroDates } from "@/lib/prisma";

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

    await fixZeroDates();

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
        nroSeguroSocial: body.nroSeguroSocial?.trim() || "",
        puestoId: parseInt(body.puestoId, 10),
        nroOperador: body.nroOperador?.trim() || "",
        calle: body.calle?.trim() || "",
        nroCasa: body.nroCasa?.trim() || "",
        sexo: body.sexo || "",
        colonia: body.colonia?.trim() || "",
        telefono: body.telefono?.trim() || "",
        celular: body.celular?.trim() || "",
        email: body.email?.trim() || "",
        fechaIngreso: body.fechaIngreso ? new Date(body.fechaIngreso) : new Date(),
        permisoAdministrador: body.permisoAdministrador || 0,
        permisoEncargadoAdministracion: body.permisoEncargadoAdministracion || 0,
        permisoSupervisor: body.permisoSupervisor || 0,
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

// PATCH /api/catalogos/empleados/[id] - Cambiar estatus (activar/desactivar)
export async function PATCH(
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
    const { estatusId } = body;

    if (estatusId !== 1 && estatusId !== 2) {
      return NextResponse.json(
        { error: "Estatus invalido. Use 1 (Activo) o 2 (Baja)" },
        { status: 400 }
      );
    }

    const existente = await prisma.empleado.findUnique({
      where: { id: empleadoId },
    });

    if (!existente) {
      return NextResponse.json(
        { error: "Empleado no encontrado" },
        { status: 404 }
      );
    }

    if (existente.estatusId === estatusId) {
      return NextResponse.json(
        { error: estatusId === 1 ? "El empleado ya esta activo" : "El empleado ya esta dado de baja" },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = { estatusId };

    if (estatusId === 2) {
      // Dar de baja
      updateData.fechaBaja = new Date();
      if (body.motivoBaja) {
        updateData.motivoBaja = body.motivoBaja;
      }
    } else {
      // Reactivar: limpiar fecha y motivo de baja
      updateData.fechaBaja = null;
      updateData.motivoBaja = "";
    }

    const empleado = await prisma.empleado.update({
      where: { id: empleadoId },
      data: updateData,
      include: { puesto: true },
    });

    const mensaje = estatusId === 1
      ? "Empleado reactivado correctamente"
      : "Empleado dado de baja correctamente";

    return NextResponse.json({ message: mensaje, data: empleado });
  } catch (error) {
    console.error("Error al cambiar estatus del empleado:", error);
    return NextResponse.json(
      { error: "Error al cambiar estatus del empleado" },
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
