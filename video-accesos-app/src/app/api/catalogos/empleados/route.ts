import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/catalogos/empleados - Listar empleados con busqueda y paginacion
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const estatusParam = searchParams.get("estatusId");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "10", 10);
    const skip = (page - 1) * pageSize;

    const where = {
      ...(search
        ? {
            OR: [
              { nombre: { contains: search } },
              { apePaterno: { contains: search } },
              { apeMaterno: { contains: search } },
              { nroOperador: { contains: search } },
            ],
          }
        : {}),
      ...(estatusParam
        ? { estatusId: parseInt(estatusParam, 10) }
        : {}),
    };

    const [empleados, total] = await Promise.all([
      prisma.empleado.findMany({
        where,
        include: { puesto: true },
        orderBy: { apePaterno: "asc" },
        skip,
        take: pageSize,
      }),
      prisma.empleado.count({ where }),
    ]);

    return NextResponse.json({
      data: empleados,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error("Error al listar empleados:", error);
    return NextResponse.json(
      { error: "Error al obtener empleados" },
      { status: 500 }
    );
  }
}

// POST /api/catalogos/empleados - Crear empleado
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const body = await request.json();

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

    const empleado = await prisma.empleado.create({
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
        fechaBaja: new Date(),
        motivoBaja: "",
        usuarioModId: (session.user as Record<string, unknown>)?.usuarioId as number ?? 0,
        estatusId: 1,
      },
      include: { puesto: true },
    });

    return NextResponse.json(empleado, { status: 201 });
  } catch (error) {
    console.error("Error al crear empleado:", error);
    return NextResponse.json(
      { error: "Error al crear empleado" },
      { status: 500 }
    );
  }
}
