import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/seguridad/sync-procesos
 * Sincroniza la tabla de procesos y subprocesos para que coincidan
 * con las ramas reales del sistema en desarrollo.
 * Solo ejecutable por usuarios del grupo admin.
 */

// Catalogo de ramas del sistema que deben existir en la BD
const CATALOGO_RAMAS = [
  {
    nombre: "Inicio",
    rutaAcceso: "/",
    subprocesos: [{ nombre: "Dashboard", funcion: "/" }],
  },
  {
    nombre: "Terminal de Monitoreo",
    rutaAcceso: "/procesos/monitoristas",
    subprocesos: [
      { nombre: "Consola Monitorista", funcion: "/procesos/monitoristas" },
    ],
  },
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

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const creados: string[] = [];
    const actualizados: string[] = [];

    for (const rama of CATALOGO_RAMAS) {
      // Buscar o crear el proceso
      let proceso = await prisma.proceso.findFirst({
        where: { nombre: rama.nombre },
      });

      if (!proceso) {
        proceso = await prisma.proceso.create({
          data: {
            nombre: rama.nombre,
            rutaAcceso: rama.rutaAcceso,
          },
        });
        creados.push(`Proceso: ${rama.nombre}`);
      } else if (proceso.rutaAcceso !== rama.rutaAcceso) {
        await prisma.proceso.update({
          where: { id: proceso.id },
          data: { rutaAcceso: rama.rutaAcceso },
        });
        actualizados.push(`Proceso: ${rama.nombre}`);
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
          actualizados.push(`  Subproceso: ${sub.nombre}`);
        }
      }
    }

    console.log(
      `[SYNC-PROCESOS] Sincronización completada. Creados: ${creados.length}, Actualizados: ${actualizados.length}`
    );

    return NextResponse.json({
      message: "Sincronización completada",
      creados,
      actualizados,
    });
  } catch (error) {
    console.error("Error al sincronizar procesos:", error);
    return NextResponse.json(
      { error: "Error al sincronizar procesos" },
      { status: 500 }
    );
  }
}
