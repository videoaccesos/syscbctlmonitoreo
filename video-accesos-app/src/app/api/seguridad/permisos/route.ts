import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/seguridad/permisos?grupoUsuarioId= - Obtener permisos de un grupo
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const grupoUsuarioId = searchParams.get("grupoUsuarioId");

    if (!grupoUsuarioId) {
      return NextResponse.json(
        { error: "grupoUsuarioId es requerido" },
        { status: 400 }
      );
    }

    const grupoId = parseInt(grupoUsuarioId, 10);

    if (isNaN(grupoId)) {
      return NextResponse.json(
        { error: "grupoUsuarioId invalido" },
        { status: 400 }
      );
    }

    // Obtener todos los procesos con subprocesos
    const procesos = await prisma.proceso.findMany({
      include: {
        subprocesos: {
          orderBy: { id: "asc" },
        },
      },
      orderBy: { id: "asc" },
    });

    // Obtener permisos actuales del grupo
    const permisos = await prisma.permisoAcceso.findMany({
      where: { grupoUsuarioId: grupoId },
    });

    const subprocesoIdsConPermiso = permisos.map((p) => p.subprocesoId);

    return NextResponse.json({
      procesos,
      subprocesoIdsConPermiso,
    });
  } catch (error) {
    console.error("Error al obtener permisos:", error);
    return NextResponse.json(
      { error: "Error al obtener permisos" },
      { status: 500 }
    );
  }
}

// PUT /api/seguridad/permisos - Actualizar permisos de un grupo
export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { grupoUsuarioId, subprocesoIds } = body;

    if (!grupoUsuarioId) {
      return NextResponse.json(
        { error: "grupoUsuarioId es requerido" },
        { status: 400 }
      );
    }

    const grupoId = parseInt(String(grupoUsuarioId), 10);

    if (isNaN(grupoId)) {
      return NextResponse.json(
        { error: "grupoUsuarioId invalido" },
        { status: 400 }
      );
    }

    // Verificar que el grupo existe
    const grupo = await prisma.grupoUsuario.findUnique({
      where: { id: grupoId },
    });

    if (!grupo) {
      return NextResponse.json(
        { error: "Grupo no encontrado" },
        { status: 404 }
      );
    }

    if (!Array.isArray(subprocesoIds)) {
      return NextResponse.json(
        { error: "subprocesoIds debe ser un arreglo" },
        { status: 400 }
      );
    }

    // Reemplazar todos los permisos en una transaccion
    await prisma.$transaction(async (tx) => {
      // Eliminar todos los permisos existentes del grupo
      await tx.permisoAcceso.deleteMany({
        where: { grupoUsuarioId: grupoId },
      });

      // Crear nuevos permisos
      if (subprocesoIds.length > 0) {
        await tx.permisoAcceso.createMany({
          data: subprocesoIds.map((subprocesoId: number) => ({
            grupoUsuarioId: grupoId,
            subprocesoId: parseInt(String(subprocesoId), 10),
          })),
        });
      }
    });

    return NextResponse.json({
      message: "Permisos actualizados correctamente",
      grupoUsuarioId: grupoId,
      totalPermisos: subprocesoIds.length,
    });
  } catch (error) {
    console.error("Error al actualizar permisos:", error);
    return NextResponse.json(
      { error: "Error al actualizar permisos" },
      { status: 500 }
    );
  }
}
