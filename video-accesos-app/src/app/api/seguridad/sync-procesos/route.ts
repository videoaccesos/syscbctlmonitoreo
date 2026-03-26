import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/seguridad/sync-procesos
 * Sincroniza la tabla de procesos y subprocesos para que coincidan
 * con las ramas reales del sistema en desarrollo.
 * Primero limpia procesos/subprocesos que no tienen permisos asignados
 * y que no corresponden al catálogo actual, luego crea los faltantes.
 */

// Catalogo de ramas del sistema que deben existir en la BD.
// Cada subproceso.funcion corresponde a una ruta del sidebar y se usa
// como identificador de permiso.  Al agregar nuevas pantallas, agregarlas
// aquí y ejecutar POST /api/seguridad/sync-procesos para sincronizar la BD.
const CATALOGO_RAMAS: Array<{
  nombre: string;
  rutaAcceso: string | null;
  subprocesos: Array<{ nombre: string; funcion: string; descripcion: string }>;
}> = [
  {
    nombre: "Catálogos",
    rutaAcceso: null,
    subprocesos: [
      { nombre: "Privadas", funcion: "/catalogos/privadas", descripcion: "Crear, editar y eliminar privadas (fraccionamientos)" },
      { nombre: "Residencias", funcion: "/catalogos/residencias", descripcion: "Administrar casas/lotes y sus residentes dentro de cada privada" },
      { nombre: "Empleados", funcion: "/catalogos/empleados", descripcion: "Alta y edición de empleados del sistema" },
      { nombre: "Tarjetas", funcion: "/catalogos/tarjetas", descripcion: "Inventario de tarjetas de acceso (altas, bajas, lecturas)" },
      { nombre: "Puestos", funcion: "/catalogos/puestos", descripcion: "Catálogo de puestos de trabajo" },
      { nombre: "Turnos", funcion: "/catalogos/turnos", descripcion: "Definición de turnos laborales" },
      { nombre: "Fallas", funcion: "/catalogos/fallas", descripcion: "Tipos de fallas para órdenes de servicio" },
      { nombre: "Materiales", funcion: "/catalogos/materiales", descripcion: "Catálogo de materiales para órdenes de servicio" },
      { nombre: "Cuentas de Gasto", funcion: "/catalogos/cuentas-gasto", descripcion: "Catálogo de cuentas contables para gastos" },
    ],
  },
  {
    nombre: "Procesos",
    rutaAcceso: null,
    subprocesos: [
      { nombre: "Registro de Accesos", funcion: "/procesos/registro-accesos", descripcion: "Registrar entradas/salidas de visitantes y residentes" },
      { nombre: "Consola Monitorista", funcion: "/procesos/monitoristas", descripcion: "Pantalla de operador: atender llamadas, registrar accesos, ver cámaras" },
      { nombre: "Asignación de Tarjetas", funcion: "/procesos/asignacion-tarjetas", descripcion: "Vender, renovar y cancelar tarjetas de acceso" },
      { nombre: "Órdenes de Servicio", funcion: "/procesos/ordenes-servicio", descripcion: "Crear y dar seguimiento a órdenes de servicio/mantenimiento" },
      { nombre: "Supervisión de Llamadas", funcion: "/procesos/supervision-llamadas", descripcion: "Evaluar calidad de atención de llamadas de operadores" },
      { nombre: "Gastos", funcion: "/procesos/gastos", descripcion: "Registrar gastos operativos por privada" },
      { nombre: "Pago de Mensualidades", funcion: "/procesos/mensualidades", descripcion: "Cobrar y consultar pagos mensuales de privadas" },
    ],
  },
  {
    nombre: "Herramientas",
    rutaAcceso: null,
    subprocesos: [
      { nombre: "Corrección Vencimientos", funcion: "/procesos/correccion-vencimientos", descripcion: "Corregir fechas de vencimiento de tarjetas masivamente" },
      { nombre: "Conciliación de Tarjetas", funcion: "/herramientas/conciliacion", descripcion: "Analizar renovaciones vs pendientes por periodo y privada" },
      { nombre: "Dashboard de Ingresos", funcion: "/herramientas/ingresos", descripcion: "Ver ingresos esperados vs cobrados: mensualidades, tarjetas, remisiones" },
      { nombre: "Prenomina Quincenal", funcion: "/procesos/prenomina", descripcion: "Generar prenómina quincenal de empleados" },
    ],
  },
  {
    nombre: "Reportes",
    rutaAcceso: null,
    subprocesos: [
      { nombre: "Accesos Consultas", funcion: "/reportes/accesos-consultas", descripcion: "Consultar historial de accesos con filtros" },
      { nombre: "Accesos Gráficas", funcion: "/reportes/accesos-graficas", descripcion: "Gráficas de accesos por periodo, privada y tipo" },
      { nombre: "Supervisión Llamadas", funcion: "/reportes/supervision-llamadas", descripcion: "Reportes de calidad de atención telefónica" },
      { nombre: "Reporte de Ventas", funcion: "/reportes/reporte-ventas", descripcion: "Detalle de tarjetas vendidas por periodo con exportación Excel" },
      { nombre: "Tarjetas por Vencer", funcion: "/reportes/tarjetas-vencimientos", descripcion: "Listado de tarjetas próximas a vencer con datos de contacto" },
      { nombre: "Listado de Tarjetas", funcion: "/reportes/catalogo-tarjetas", descripcion: "Consulta general del inventario de tarjetas" },
    ],
  },
  {
    nombre: "Seguridad",
    rutaAcceso: null,
    subprocesos: [
      { nombre: "Usuarios", funcion: "/seguridad/usuarios", descripcion: "Crear, editar y desactivar usuarios del sistema" },
      { nombre: "Grupos de Usuario", funcion: "/seguridad/grupos-usuarios", descripcion: "Administrar grupos y asignar usuarios a grupos" },
      { nombre: "Permisos de Acceso", funcion: "/seguridad/permisos", descripcion: "Asignar permisos de pantallas a cada grupo" },
    ],
  },
];


export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const creados: string[] = [];
    const actualizados: string[] = [];

    // Crear/actualizar procesos y subprocesos del catálogo (no se elimina nada)
    for (const rama of CATALOGO_RAMAS) {
      // Buscar proceso existente (case-insensitive check en JS)
      const existentes = await prisma.proceso.findMany();
      let proceso = existentes.find(
        (p) => p.nombre.toLowerCase() === rama.nombre.toLowerCase()
      );

      if (!proceso) {
        proceso = await prisma.proceso.create({
          data: {
            nombre: rama.nombre,
            rutaAcceso: rama.rutaAcceso,
          },
        });
        creados.push(`Proceso: ${rama.nombre}`);
      } else {
        // Actualizar nombre (para corregir mayúsculas) y rutaAcceso si difieren
        if (proceso.nombre !== rama.nombre || proceso.rutaAcceso !== rama.rutaAcceso) {
          await prisma.proceso.update({
            where: { id: proceso.id },
            data: {
              nombre: rama.nombre,
              rutaAcceso: rama.rutaAcceso,
            },
          });
          actualizados.push(`Proceso: ${proceso.nombre} → ${rama.nombre}`);
        }
      }

      // Sincronizar subprocesos
      for (const sub of rama.subprocesos) {
        const existeSub = await prisma.subproceso.findFirst({
          where: {
            procesoId: proceso.id,
            funcion: sub.funcion,
          },
        });

        if (!existeSub) {
          await prisma.subproceso.create({
            data: {
              procesoId: proceso.id,
              nombre: sub.nombre,
              funcion: sub.funcion,
            },
          });
          creados.push(`  Subproceso: ${sub.nombre} (${sub.funcion})`);
        } else if (existeSub.nombre !== sub.nombre) {
          await prisma.subproceso.update({
            where: { id: existeSub.id },
            data: { nombre: sub.nombre },
          });
          actualizados.push(`  Subproceso: ${existeSub.nombre} → ${sub.nombre}`);
        }
      }
    }

    // Limpiar subprocesos huérfanos (no están en el catálogo)
    // Se eliminan TODOS los huérfanos junto con sus permisos para evitar
    // que ensucien la asignación de permisos y el JWT del usuario.
    const funcionesCatalogo = new Set(
      CATALOGO_RAMAS.flatMap((r) => r.subprocesos.map((s) => s.funcion))
    );
    const eliminados: string[] = [];

    const todosSubprocesos = await prisma.subproceso.findMany({
      include: { _count: { select: { permisos: true } } },
    });

    for (const sub of todosSubprocesos) {
      if (!sub.funcion || !funcionesCatalogo.has(sub.funcion)) {
        // Eliminar permisos asociados primero, luego el subproceso
        if (sub._count.permisos > 0) {
          await prisma.permisoAcceso.deleteMany({
            where: { subprocesoId: sub.id },
          });
        }
        await prisma.subproceso.delete({ where: { id: sub.id } });
        eliminados.push(`  Subproceso huérfano: ${sub.nombre} (${sub.funcion || "sin función"}) [${sub._count.permisos} permisos]`);
      }
    }

    // Limpiar procesos que quedaron sin subprocesos
    const procesosVacios = await prisma.proceso.findMany({
      include: { _count: { select: { subprocesos: true } } },
    });
    for (const proc of procesosVacios) {
      if (proc._count.subprocesos === 0) {
        await prisma.proceso.delete({ where: { id: proc.id } });
        eliminados.push(`Proceso vacío eliminado: ${proc.nombre}`);
      }
    }

    console.log(
      `[SYNC-PROCESOS] Completado. Creados: ${creados.length}, Actualizados: ${actualizados.length}, Eliminados: ${eliminados.length}`
    );

    return NextResponse.json({
      message: "Sincronización completada",
      creados,
      actualizados,
      eliminados,
    });
  } catch (error) {
    console.error("Error al sincronizar procesos:", error);
    return NextResponse.json(
      { error: "Error al sincronizar procesos" },
      { status: 500 }
    );
  }
}
