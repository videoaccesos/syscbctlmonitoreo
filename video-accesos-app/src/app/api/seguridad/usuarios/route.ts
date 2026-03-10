import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const crypt = require("unix-crypt-td-js");

// GET /api/seguridad/usuarios - Listar usuarios con busqueda y paginacion
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
    const estatusFilter = searchParams.get("estatus") || "activos"; // activos | baja | todos
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = {};
    if (search) {
      where.usuario = { contains: search };
    }
    if (estatusFilter === "activos") {
      where.estatusId = 1;
    } else if (estatusFilter === "baja") {
      where.estatusId = 2;
    }
    // "todos" = sin filtro de estatus

    const [usuarios, total] = await Promise.all([
      prisma.usuario.findMany({
        where,
        include: {
          empleado: true,
          gruposDetalles: {
            include: {
              grupo: true,
            },
          },
        },
        orderBy: { usuario: "asc" },
        skip,
        take: pageSize,
      }),
      prisma.usuario.count({ where }),
    ]);

    // Excluir contrasena de la respuesta
    const usuariosSinContrasena = usuarios.map(({ contrasena, ...rest }: { contrasena: unknown; [key: string]: unknown }) => rest);

    return NextResponse.json({
      data: usuariosSinContrasena,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error("Error al listar usuarios:", error);
    return NextResponse.json(
      { error: "Error al obtener usuarios" },
      { status: 500 }
    );
  }
}

// POST /api/seguridad/usuarios - Crear usuario
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const body = await request.json();

    const { usuario, contrasena } = body;

    if (!usuario?.trim()) {
      return NextResponse.json(
        { error: "El nombre de usuario es requerido" },
        { status: 400 }
      );
    }

    if (!contrasena || contrasena.length < 6) {
      return NextResponse.json(
        { error: "La contrasena debe tener al menos 6 caracteres" },
        { status: 400 }
      );
    }

    if (contrasena.length > 10) {
      return NextResponse.json(
        { error: "La contrasena no puede tener mas de 10 caracteres" },
        { status: 400 }
      );
    }

    // Verificar duplicado
    const existente = await prisma.usuario.findFirst({
      where: { usuario: usuario.trim() },
    });

    if (existente) {
      return NextResponse.json(
        { error: "Ya existe un usuario con ese nombre" },
        { status: 409 }
      );
    }

    // Hash con DES crypt compatible con legacy PHP: substr(crypt($pass, salt), 0, 10)
    const saltChars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789./";
    const salt = saltChars[Math.floor(Math.random() * saltChars.length)] + saltChars[Math.floor(Math.random() * saltChars.length)];
    const hashedPassword = crypt(contrasena, salt).substring(0, 10);
    const nuevoUsuario = await prisma.usuario.create({
      data: {
        usuario: usuario.trim(),
        contrasena: hashedPassword,
        empleadoId: body.empleadoId ? parseInt(body.empleadoId, 10) : null,
        privadaId: body.privadaId ? parseInt(body.privadaId, 10) : null,
        modificarFechas: body.modificarFechas || "N",
        logueado: body.logueado || 0,
        usuarioMovId: body.usuarioMovId || 0,
        estatusId: 1,
      },
      include: {
        empleado: true,
        gruposDetalles: {
          include: { grupo: true },
        },
      },
    });

    // Excluir contrasena de la respuesta
    const { contrasena: _, ...usuarioSinContrasena } = nuevoUsuario;

    return NextResponse.json(usuarioSinContrasena, { status: 201 });
  } catch (error) {
    console.error("Error al crear usuario:", JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    return NextResponse.json(
      { error: "Error al crear usuario" },
      { status: 500 }
    );
  }
}
