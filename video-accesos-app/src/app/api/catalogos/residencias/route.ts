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
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

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
        telefono1: telefono1 || null,
        telefono2: telefono2 || null,
        interfon: interfon || null,
        telefonoInterfon: telefonoInterfon || null,
        observaciones: observaciones || null,
        estatusId: estatusId ? parseInt(estatusId) : 1,
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
