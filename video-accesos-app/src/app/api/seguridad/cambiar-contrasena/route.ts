import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const crypt = require("unix-crypt-td-js");

/**
 * POST /api/seguridad/cambiar-contrasena
 * Permite al usuario autenticado cambiar su propia contrasena.
 * Replica la logica legacy de PHP: substr(crypt($cadena, salt), 0, 10)
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.usuarioId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { contrasenaActual, contrasenaNueva, contrasenaConfirmar } = body;

    if (!contrasenaActual || !contrasenaNueva || !contrasenaConfirmar) {
      return NextResponse.json(
        { error: "Todos los campos son requeridos" },
        { status: 400 }
      );
    }

    if (contrasenaNueva.length < 4) {
      return NextResponse.json(
        { error: "La nueva contraseña debe tener al menos 4 caracteres" },
        { status: 400 }
      );
    }

    if (contrasenaNueva.length > 10) {
      return NextResponse.json(
        { error: "La contraseña no puede tener más de 10 caracteres" },
        { status: 400 }
      );
    }

    if (contrasenaNueva !== contrasenaConfirmar) {
      return NextResponse.json(
        { error: "La nueva contraseña y la confirmación no coinciden" },
        { status: 400 }
      );
    }

    // Obtener usuario actual
    const usuario = await prisma.usuario.findUnique({
      where: { id: session.user.usuarioId },
      select: { id: true, contrasena: true },
    });

    if (!usuario) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    // Verificar contrasena actual (DES crypt legacy)
    const salt = usuario.contrasena.substring(0, 2);
    const hashActual = crypt(contrasenaActual, salt).substring(0, 10);
    if (hashActual !== usuario.contrasena) {
      return NextResponse.json(
        { error: "La contraseña actual es incorrecta" },
        { status: 400 }
      );
    }

    // Encriptar nueva contrasena con DES crypt (compatible con legacy PHP)
    const hashNueva = crypt(contrasenaNueva, "0").substring(0, 10);

    // Actualizar en BD
    await prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        contrasena: hashNueva,
        cambioContrasena: new Date(),
      },
    });

    return NextResponse.json({ mensaje: "Contraseña actualizada correctamente" });
  } catch (error) {
    console.error("Error al cambiar contraseña:", error);
    return NextResponse.json(
      { error: "Error al cambiar la contraseña" },
      { status: 500 }
    );
  }
}
