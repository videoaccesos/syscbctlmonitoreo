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

// Catalogo de ramas del sistema que deben existir en la BD
const CATALOGO_RAMAS = [
  {
    nombre: "Catálogos",
    rutaAcceso: null,
    subprocesos: [
      { nombre: "Privadas", funcion: "/catalogos/privadas" },
      { nombre: "Residencias", funcion: "/catalogos/residencias" },
      { nombre: "Empleados", funcion: "/catalogos/empleados" },
      { nombre: "Tarjetas", funcion: "/catalogos/tarjetas" },
      { nombre: "Puestos", funcion: "/catalogos/puestos" },
      { nombre: "Turnos", funcion: "/catalogos/turnos" },
      { nombre: "Fallas", funcion: "/catalogos/fallas" },
      { nombre: "Materiales", funcion: "/catalogos/materiales" },
    ],
  },
  {
    nombre: "Procesos",
    rutaAcceso: null,
    subprocesos: [
      { nombre: "Registro de Accesos", funcion: "/procesos/registro-accesos" },
      { nombre: "Consola Monitorista", funcion: "/procesos/monitoristas" },
      { nombre: "Asignación de Tarjetas", funcion: "/procesos/asignacion-tarjetas" },
      { nombre: "Órdenes de Servicio", funcion: "/procesos/ordenes-servicio" },
      { nombre: "Supervisión de Llamadas", funcion: "/procesos/supervision-llamadas" },
      { nombre: "Gastos", funcion: "/procesos/gastos" },
    ],
  },
  {
    nombre: "Reportes",
    rutaAcceso: null,
    subprocesos: [
      { nombre: "Accesos Consultas", funcion: "/reportes/accesos-consultas" },
      { nombre: "Accesos Gráficas", funcion: "/reportes/accesos-graficas" },
      { nombre: "Supervisión Llamadas", funcion: "/reportes/supervision-llamadas" },
      { nombre: "Reporte de Ventas", funcion: "/reportes/reporte-ventas" },
    ],
  },
  {
    nombre: "Seguridad",
    rutaAcceso: null,
    subprocesos: [
      { nombre: "Usuarios", funcion: "/seguridad/usuarios" },
      { nombre: "Grupos de Usuario", funcion: "/seguridad/grupos-usuarios" },
      { nombre: "Permisos de Acceso", funcion: "/seguridad/permisos" },
    ],
  },
];

// Todas las funciones/rutas válidas del catálogo
const FUNCIONES_VALIDAS = new Set(
  CATALOGO_RAMAS.flatMap((r) => r.subprocesos.map((s) => s.funcion))
);

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const creados: string[] = [];
    const actualizados: string[] = [];
    const eliminados: string[] = [];

    // Paso 1: Limpiar subprocesos huérfanos (sin permisos y con funciones que no están en el catálogo)
    const todosSubprocesos = await prisma.subproceso.findMany({
      include: {
        permisos: true,
        proceso: true,
      },
    });

    for (const sub of todosSubprocesos) {
      // Si el subproceso no tiene funcion válida y no tiene permisos asignados, eliminarlo
      if (sub.funcion && !FUNCIONES_VALIDAS.has(sub.funcion) && sub.permisos.length === 0) {
        await prisma.subproceso.delete({ where: { id: sub.id } });
        eliminados.push(`Subproceso: ${sub.nombre} (${sub.funcion}) del proceso ${sub.proceso.nombre}`);
      }
    }

    // Paso 2: Limpiar procesos vacíos que no están en el catálogo
    const nombresCatalogo = new Set(CATALOGO_RAMAS.map((r) => r.nombre));
    const todosProcesos = await prisma.proceso.findMany({
      include: { subprocesos: true },
    });

    for (const proc of todosProcesos) {
      if (!nombresCatalogo.has(proc.nombre) && proc.subprocesos.length === 0) {
        await prisma.proceso.delete({ where: { id: proc.id } });
        eliminados.push(`Proceso vacío: ${proc.nombre}`);
      }
    }

    // Paso 3: Crear/actualizar procesos y subprocesos del catálogo
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
