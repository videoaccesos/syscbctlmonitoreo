import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

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

    // Funciones válidas del catálogo actual (solo estas se muestran)
    const FUNCIONES_CATALOGO = new Set([
      "/catalogos/privadas", "/catalogos/residencias", "/catalogos/empleados",
      "/catalogos/tarjetas", "/catalogos/puestos", "/catalogos/turnos",
      "/catalogos/fallas", "/catalogos/materiales", "/catalogos/cuentas-gasto",
      "/procesos/registro-accesos", "/procesos/monitoristas",
      "/procesos/asignacion-tarjetas", "/procesos/ordenes-servicio",
      "/procesos/supervision-llamadas", "/procesos/gastos", "/procesos/mensualidades",
      "/procesos/correccion-vencimientos", "/herramientas/conciliacion", "/procesos/prenomina",
      "/reportes/accesos-consultas", "/reportes/accesos-graficas",
      "/reportes/supervision-llamadas", "/reportes/reporte-ventas",
      "/reportes/tarjetas-vencimientos", "/reportes/catalogo-tarjetas",
      "/seguridad/usuarios", "/seguridad/grupos-usuarios", "/seguridad/permisos",
    ]);

    // Obtener solo procesos que tienen subprocesos válidos del catálogo
    const todosProc = await prisma.proceso.findMany({
      include: {
        subprocesos: {
          orderBy: { id: "asc" },
        },
      },
      orderBy: { id: "asc" },
    });

    // Filtrar: solo subprocesos con funcion en el catálogo, y solo procesos con al menos uno
    const procesos = todosProc
      .map((p) => ({
        ...p,
        subprocesos: p.subprocesos.filter((s) => s.funcion && FUNCIONES_CATALOGO.has(s.funcion)),
      }))
      .filter((p) => p.subprocesos.length > 0);

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
