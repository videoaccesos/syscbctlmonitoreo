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

    // Funciones válidas del catálogo actual con descripción de lo que autorizan
    const FUNCIONES_CATALOGO: Record<string, string> = {
      "/catalogos/privadas": "Crear, editar y eliminar privadas (fraccionamientos)",
      "/catalogos/residencias": "Administrar casas/lotes y sus residentes dentro de cada privada",
      "/catalogos/empleados": "Alta y edición de empleados del sistema",
      "/catalogos/tarjetas": "Inventario de tarjetas de acceso (altas, bajas, lecturas)",
      "/catalogos/puestos": "Catálogo de puestos de trabajo",
      "/catalogos/turnos": "Definición de turnos laborales",
      "/catalogos/fallas": "Tipos de fallas para órdenes de servicio",
      "/catalogos/materiales": "Catálogo de materiales para órdenes de servicio",
      "/catalogos/cuentas-gasto": "Catálogo de cuentas contables para gastos",
      "/procesos/registro-accesos": "Registrar entradas/salidas de visitantes y residentes",
      "/procesos/monitoristas": "Pantalla de operador: atender llamadas, registrar accesos, ver cámaras",
      "/procesos/asignacion-tarjetas": "Vender, renovar y cancelar tarjetas de acceso",
      "/procesos/ordenes-servicio": "Crear y dar seguimiento a órdenes de servicio/mantenimiento",
      "/procesos/supervision-llamadas": "Evaluar calidad de atención de llamadas de operadores",
      "/procesos/gastos": "Registrar gastos operativos por privada",
      "/procesos/mensualidades": "Cobrar y consultar pagos mensuales de privadas",
      "/procesos/correccion-vencimientos": "Corregir fechas de vencimiento de tarjetas masivamente",
      "/herramientas/conciliacion": "Analizar renovaciones vs pendientes por periodo y privada",
      "/herramientas/ingresos": "Ver ingresos esperados vs cobrados: mensualidades, tarjetas, remisiones",
      "/herramientas/video-web": "Ver cámaras de video en vivo desde los DVR de las privadas",
      "/procesos/prenomina": "Generar prenómina quincenal de empleados",
      "/reportes/accesos-consultas": "Consultar historial de accesos con filtros",
      "/reportes/accesos-graficas": "Gráficas de accesos por periodo, privada y tipo",
      "/reportes/supervision-llamadas": "Reportes de calidad de atención telefónica",
      "/reportes/reporte-ventas": "Detalle de tarjetas vendidas por periodo con exportación Excel",
      "/reportes/tarjetas-vencimientos": "Listado de tarjetas próximas a vencer con datos de contacto",
      "/reportes/catalogo-tarjetas": "Consulta general del inventario de tarjetas",
      "/seguridad/usuarios": "Crear, editar y desactivar usuarios del sistema",
      "/seguridad/grupos-usuarios": "Administrar grupos y asignar usuarios a grupos",
      "/seguridad/permisos": "Asignar permisos de pantallas a cada grupo",
    };

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
    // Agregar descripción de lo que autoriza cada permiso
    const procesos = todosProc
      .map((p) => ({
        ...p,
        subprocesos: p.subprocesos
          .filter((s) => s.funcion && s.funcion in FUNCIONES_CATALOGO)
          .map((s) => ({
            ...s,
            descripcion: s.funcion ? FUNCIONES_CATALOGO[s.funcion] || "" : "",
          })),
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
