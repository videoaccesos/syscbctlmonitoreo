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
