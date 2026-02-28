import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/catalogos/residencias - Listar residencias con busqueda, paginacion y filtro por privada
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";
    const privadaId = searchParams.get("privadaId");
    const residenciaId = searchParams.get("residenciaId");
    const skip = (page - 1) * limit;

    // Excluir eliminados (estatus 5) replicando el comportamiento legacy
    // Excluir residencias cuya privada esta dada de baja (estatusId 2) o sistema (4)
    const where: Record<string, unknown> = {
      estatusId: { not: 5 },
      privada: {
        estatusId: { notIn: [2, 4] },
      },
    };

    if (residenciaId) {
      where.id = parseInt(residenciaId);
    }

    if (privadaId) {
      where.privadaId = parseInt(privadaId);
    }

    if (search) {
      where.OR = [
        { nroCasa: { contains: search } },
        { calle: { contains: search } },
      ];
    }

    const [residencias, total] = await Promise.all([
      prisma.residencia.findMany({
        where,
        include: {
          privada: {
            select: { id: true, descripcion: true },
          },
          residentes: {
            select: {
              id: true,
              nombre: true,
              apePaterno: true,
              apeMaterno: true,
              celular: true,
              email: true,
              estatusId: true,
              tarjetasAsignadas: {
                select: {
                  tarjetaId: true,
                  tarjetaId2: true,
                  tarjetaId3: true,
                  tarjetaId4: true,
                  tarjetaId5: true,
                  estatusId: true,
                },
              },
              tarjetasSinRenovacion: {
                select: {
                  tarjetaId: true,
                  tarjetaId2: true,
                  tarjetaId3: true,
                  tarjetaId4: true,
                  tarjetaId5: true,
                  estatusId: true,
                },
              },
            },
            orderBy: { apePaterno: "asc" },
          },
        },
        orderBy: { id: "desc" },
        skip,
        take: limit,
      }),
      prisma.residencia.count({ where }),
    ]);

    return NextResponse.json({
      data: residencias,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error al listar residencias:", error);
    return NextResponse.json(
      { error: "Error al listar residencias" },
      { status: 500 }
    );
  }
}

// POST /api/catalogos/residencias - Crear residencia
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
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

    const residencia = await prisma.residencia.create({
      data: {
        privadaId: parseInt(privadaId),
        nroCasa,
        calle,
        telefono1: telefono1 || "",
        telefono2: telefono2 || "",
        interfon: interfon || "",
        telefonoInterfon: telefonoInterfon || "",
        observaciones: observaciones || "",
        estatusId: estatusId ? parseInt(estatusId) : 1,
        usuarioModId: 0,
      },
      include: {
        privada: {
          select: { id: true, descripcion: true },
        },
      },
    });

    return NextResponse.json(residencia, { status: 201 });
  } catch (error) {
    console.error("Error al crear residencia:", error);
    return NextResponse.json(
      { error: "Error al crear residencia" },
      { status: 500 }
    );
  }
}
