import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions, verificarAccesoSeguridad } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

// GET /api/seguridad/permisos?grupoUsuarioId= - Obtener permisos de un grupo
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const denegado = verificarAccesoSeguridad(session);
  if (denegado) return denegado;

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

    // Obtener todos los procesos con subprocesos (solo los que tienen padre,
    // ya que los padres son categorias y los hijos son los items de menu reales)
    const procesos = await prisma.proceso.findMany({
      where: {
        subprocesos: { some: {} }, // Solo procesos que tienen al menos un subproceso
      },
      include: {
        subprocesos: {
          orderBy: { id: "asc" },
        },
        procesoPadre: {
          select: { id: true, nombre: true },
        },
      },
      orderBy: { id: "asc" },
    });

    // Obtener permisos actuales del grupo
    const permisos = await prisma.permisoAcceso.findMany({
      where: { grupoUsuarioId: grupoId },
    });

    const subprocesoIdsConPermiso = permisos.map((p: { subprocesoId: number }) => p.subprocesoId);

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
  const denegado = verificarAccesoSeguridad(session);
  if (denegado) return denegado;

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
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
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

      // VALIDACION ANTI-LOCKOUT: Verificar que al menos un grupo activo
      // conserve acceso a las rutas de Seguridad despues de este cambio.
      // Si nadie tiene acceso a Seguridad, no se puede arreglar desde la app.
      const gruposConSeguridad = await tx.$queryRawUnsafe<Array<{ cnt: bigint }>>(`
        SELECT COUNT(DISTINCT gu.grupo_usuario_id) AS cnt
        FROM grupos_usuarios gu
        INNER JOIN permisos_acceso pa ON pa.grupo_usuario_id = gu.grupo_usuario_id
        INNER JOIN subprocesos sp ON sp.subproceso_id = pa.subproceso_id
        WHERE gu.estatus_id = 1
          AND (sp.funcion LIKE '/seguridad/%' OR sp.funcion IN ('/seguridad/usuarios', '/seguridad/grupos-usuarios', '/seguridad/permisos'))
      `);

      const totalGruposConSeguridad = Number(gruposConSeguridad[0]?.cnt || 0);

      if (totalGruposConSeguridad === 0) {
        throw new Error("LOCKOUT_PREVENTION");
      }
    });

    return NextResponse.json({
      message: "Permisos actualizados correctamente",
      grupoUsuarioId: grupoId,
      totalPermisos: subprocesoIds.length,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "LOCKOUT_PREVENTION") {
      return NextResponse.json(
        {
          error: "No se pueden guardar estos permisos porque ningún grupo activo conservaría acceso al módulo de Seguridad. " +
            "Al menos un grupo debe tener permisos de Seguridad (Usuarios, Grupos, Permisos) para evitar bloqueo permanente.",
        },
        { status: 422 }
      );
    }
    console.error("Error al actualizar permisos:", error);
    return NextResponse.json(
      { error: "Error al actualizar permisos" },
      { status: 500 }
    );
  }
}
