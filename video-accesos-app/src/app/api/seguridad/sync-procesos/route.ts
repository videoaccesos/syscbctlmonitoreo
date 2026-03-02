import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MENU_CONFIG } from "@/lib/menu-config";

/**
 * POST /api/seguridad/sync-procesos
 *
 * Sincroniza la tabla procesos/subprocesos en BD con la configuracion
 * de menu definida en menu-config.ts. Crea procesos y subprocesos
 * faltantes sin eliminar los existentes (para no perder permisos).
 */
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const created: string[] = [];

    for (const item of MENU_CONFIG) {
      // Items con ruta directa (sin hijos) = proceso padre con un subproceso
      if (item.rutaAcceso && !item.hijos) {
        let proceso = await prisma.proceso.findFirst({
          where: { nombre: item.nombre, procesoPadreId: null },
        });

        if (!proceso) {
          // Check by procesoPadreId = 0 (legacy) or null
          proceso = await prisma.proceso.findFirst({
            where: { nombre: item.nombre },
          });
        }

        if (!proceso) {
          proceso = await prisma.proceso.create({
            data: {
              nombre: item.nombre,
              rutaAcceso: item.rutaAcceso,
              procesoPadreId: null,
              usuarioModId: 0,
            },
          });
          created.push(`Proceso: ${item.nombre}`);
        }

        // Ensure at least one subproceso exists
        const subCount = await prisma.subproceso.count({
          where: { procesoId: proceso.id },
        });
        if (subCount === 0) {
          await prisma.subproceso.create({
            data: {
              procesoId: proceso.id,
              nombre: item.nombre,
              funcion: item.rutaAcceso,
            },
          });
          created.push(`Subproceso: ${item.nombre} -> ${item.rutaAcceso}`);
        }
        continue;
      }

      // Items con hijos = proceso padre + procesos hijos con subprocesos
      if (item.hijos) {
        // Find or create the parent proceso
        let padre = await prisma.proceso.findFirst({
          where: { nombre: item.nombre, procesoPadreId: null },
        });

        if (!padre) {
          padre = await prisma.proceso.findFirst({
            where: { nombre: item.nombre },
          });
        }

        if (!padre) {
          padre = await prisma.proceso.create({
            data: {
              nombre: item.nombre,
              rutaAcceso: null,
              procesoPadreId: null,
              usuarioModId: 0,
            },
          });
          created.push(`Proceso padre: ${item.nombre}`);
        }

        for (const hijo of item.hijos) {
          // Find or create the child proceso
          let procesoHijo = await prisma.proceso.findFirst({
            where: { nombre: hijo.nombre, procesoPadreId: padre.id },
          });

          if (!procesoHijo) {
            procesoHijo = await prisma.proceso.create({
              data: {
                nombre: hijo.nombre,
                rutaAcceso: hijo.funcion,
                procesoPadreId: padre.id,
                usuarioModId: 0,
              },
            });
            created.push(`Proceso hijo: ${hijo.nombre}`);
          }

          // Ensure subproceso exists with the correct funcion/ruta
          const existingSub = await prisma.subproceso.findFirst({
            where: { procesoId: procesoHijo.id },
          });

          if (!existingSub) {
            await prisma.subproceso.create({
              data: {
                procesoId: procesoHijo.id,
                nombre: hijo.nombre,
                funcion: hijo.funcion,
              },
            });
            created.push(`Subproceso: ${hijo.nombre} -> ${hijo.funcion}`);
          }
        }
      }
    }

    return NextResponse.json({
      message: "Sincronización completada",
      created,
      totalCreated: created.length,
    });
  } catch (error) {
    console.error("Error al sincronizar procesos:", error);
    return NextResponse.json(
      { error: "Error al sincronizar procesos" },
      { status: 500 }
    );
  }
}
