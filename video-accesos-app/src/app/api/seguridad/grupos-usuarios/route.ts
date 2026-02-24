import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/seguridad/grupos-usuarios - Listar grupos de usuarios con conteo
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
            nombre: { contains: search },
          }
        : {}),
    };

    const [grupos, total] = await Promise.all([
      prisma.grupoUsuario.findMany({
        where,
        include: {
          _count: {
            select: { detalles: true },
          },
        },
        orderBy: { nombre: "asc" },
        skip,
        take: pageSize,
      }),
      prisma.grupoUsuario.count({ where }),
    ]);

    return NextResponse.json({
      data: grupos,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error("Error al listar grupos de usuarios:", error);
    return NextResponse.json(
      { error: "Error al obtener grupos de usuarios" },
      { status: 500 }
    );
  }
}

// POST /api/seguridad/grupos-usuarios - Crear grupo de usuarios
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const body = await request.json();

    const { nombre } = body;

    if (!nombre?.trim()) {
      return NextResponse.json(
        { error: "El nombre del grupo es requerido" },
        { status: 400 }
      );
    }

    // Verificar duplicado
    const existente = await prisma.grupoUsuario.findFirst({
      where: { nombre: nombre.trim() },
    });

    if (existente) {
      return NextResponse.json(
        { error: "Ya existe un grupo con ese nombre" },
        { status: 409 }
      );
    }

    const grupo = await prisma.grupoUsuario.create({
      data: {
        nombre: nombre.trim(),
        estatusId: 1,
      },
      include: {
        _count: {
          select: { detalles: true },
        },
      },
    });

    return NextResponse.json(grupo, { status: 201 });
  } catch (error) {
    console.error("Error al crear grupo de usuarios:", error);
    return NextResponse.json(
      { error: "Error al crear grupo de usuarios" },
      { status: 500 }
    );
  }
}
