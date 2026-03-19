import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const crypt = require("unix-crypt-td-js");

// GET /api/seguridad/usuarios/[id] - Obtener un usuario por ID
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
    const usuarioId = parseInt(id, 10);

    if (isNaN(usuarioId)) {
      return NextResponse.json({ error: "ID invalido" }, { status: 400 });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: usuarioId },
      include: {
        empleado: true,
        gruposDetalles: {
          include: { grupo: true },
        },
      },
    });

    if (!usuario) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    // Excluir contrasena de la respuesta
    const { contrasena, ...usuarioSinContrasena } = usuario;

    return NextResponse.json(usuarioSinContrasena);
  } catch (error) {
    console.error("Error al obtener usuario:", error);
    return NextResponse.json(
      { error: "Error al obtener usuario" },
      { status: 500 }
    );
  }
}

// PUT /api/seguridad/usuarios/[id] - Actualizar usuario
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
    const usuarioId = parseInt(id, 10);

    if (isNaN(usuarioId)) {
      return NextResponse.json({ error: "ID invalido" }, { status: 400 });
    }

    const body = await request.json();

    // Verificar que existe
    const existente = await prisma.usuario.findUnique({
      where: { id: usuarioId },
    });

    if (!existente) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    const { usuario, contrasena } = body;

    if (!usuario?.trim()) {
      return NextResponse.json(
        { error: "El nombre de usuario es requerido" },
        { status: 400 }
      );
    }

    // Verificar duplicado (excluyendo el actual)
    const duplicado = await prisma.usuario.findFirst({
      where: {
        usuario: usuario.trim(),
        id: { not: usuarioId },
      },
    });

    if (duplicado) {
      return NextResponse.json(
        { error: "Ya existe un usuario con ese nombre" },
        { status: 409 }
      );
    }

    // Preparar datos de actualizacion
    const updateData: Record<string, unknown> = {
      usuario: usuario.trim(),
      empleadoId: body.empleadoId ? parseInt(body.empleadoId, 10) : null,
      privadaId: body.privadaId ? parseInt(body.privadaId, 10) : null,
      modificarFechas: body.modificarFechas || "N",
      logueado: body.logueado || 0,
      usuarioMovId: body.usuarioMovId || 0,
    };

    // Si se proporciona contrasena, hashear con DES crypt (compatible con legacy PHP)
    // El sistema legacy usa: substr(crypt($cadena, 0), 0, 10)
    if (contrasena && contrasena.length > 0) {
      if (contrasena.length < 6) {
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
      // Hash con DES crypt compatible con legacy PHP: substr(crypt($pass, salt), 0, 10)
      const saltChars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789./";
      const salt = saltChars[Math.floor(Math.random() * saltChars.length)] + saltChars[Math.floor(Math.random() * saltChars.length)];
      const hashed = crypt(contrasena, salt).substring(0, 10);
      updateData.contrasena = hashed;
      const ahora = new Date();
      updateData.cambioContrasena = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
    }

    // Setear fechaModificacion como DATE (sin hora) para MySQL DATE column
    const hoy = new Date();
    updateData.fechaModificacion = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());

    const usuarioActualizado = await prisma.usuario.update({
      where: { id: usuarioId },
      data: updateData,
      include: {
        empleado: true,
        gruposDetalles: {
          include: { grupo: true },
        },
      },
    });

    // Excluir contrasena de la respuesta
    const { contrasena: _, ...usuarioSinContrasena } = usuarioActualizado;

    return NextResponse.json(usuarioSinContrasena);
  } catch (error) {
    console.error("Error al actualizar usuario:", error);
    return NextResponse.json(
      { error: "Error al actualizar usuario" },
      { status: 500 }
    );
  }
}

// DELETE /api/seguridad/usuarios/[id] - Baja logica (estatusId=2)
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
    const usuarioId = parseInt(id, 10);

    if (isNaN(usuarioId)) {
      return NextResponse.json({ error: "ID invalido" }, { status: 400 });
    }

    // Verificar que existe y esta activo
    const existente = await prisma.usuario.findFirst({
      where: { id: usuarioId, estatusId: 1 },
    });

    if (!existente) {
      return NextResponse.json(
        { error: "Usuario no encontrado o ya dado de baja" },
        { status: 404 }
      );
    }

    // Soft delete: cambiar estatus a 2 (Baja)
    const hoy = new Date();
    const fechaHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
    await prisma.usuario.update({
      where: { id: usuarioId },
      data: { estatusId: 2, fechaModificacion: fechaHoy },
    });

    return NextResponse.json({ message: "Usuario dado de baja correctamente" });
  } catch (error) {
    console.error("Error al dar de baja usuario:", error);
    return NextResponse.json(
      { error: "Error al dar de baja usuario" },
      { status: 500 }
    );
  }
}
