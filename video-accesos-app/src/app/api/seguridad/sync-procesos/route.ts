import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions, verificarAccesoSeguridad } from "@/lib/auth";
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
  const denegado = verificarAccesoSeguridad(session);
  if (denegado) return denegado;

  try {
    const changes: string[] = [];

    for (const item of MENU_CONFIG) {
      // Items con ruta directa (sin hijos) = proceso raiz con un subproceso
      if (item.rutaAcceso && !item.hijos) {
        // Buscar por nombre (flexible: con o sin procesoPadreId)
        let proceso = await prisma.proceso.findFirst({
          where: { nombre: item.nombre },
        });

        if (!proceso) {
          proceso = await prisma.proceso.create({
            data: {
              nombre: item.nombre,
              rutaAcceso: item.rutaAcceso,
              procesoPadreId: null,
              usuarioModId: 0,
            },
          });
          changes.push(`+ Proceso: ${item.nombre}`);
        } else if (proceso.rutaAcceso !== item.rutaAcceso) {
          // Actualizar ruta si cambio
          await prisma.proceso.update({
            where: { id: proceso.id },
            data: { rutaAcceso: item.rutaAcceso },
          });
          changes.push(`~ Proceso actualizado: ${item.nombre} -> ${item.rutaAcceso}`);
        }

        // Buscar o crear subproceso con funcion correcta
        const existingSub = await prisma.subproceso.findFirst({
          where: { procesoId: proceso.id },
        });

        if (!existingSub) {
          await prisma.subproceso.create({
            data: {
              procesoId: proceso.id,
              nombre: item.nombre,
              funcion: item.rutaAcceso,
            },
          });
          changes.push(`+ Subproceso: ${item.nombre} -> ${item.rutaAcceso}`);
        } else if (existingSub.funcion !== item.rutaAcceso) {
          // Actualizar funcion si cambio
          await prisma.subproceso.update({
            where: { id: existingSub.id },
            data: { funcion: item.rutaAcceso, nombre: item.nombre },
          });
          changes.push(`~ Subproceso actualizado: ${item.nombre} -> ${item.rutaAcceso}`);
        }
        continue;
      }

      // Items con hijos = proceso padre + procesos hijos con subprocesos
      if (item.hijos) {
        // Buscar o crear padre
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
          changes.push(`+ Proceso padre: ${item.nombre}`);
        }

        for (const hijo of item.hijos) {
          // Buscar hijo por nombre bajo este padre
          let procesoHijo = await prisma.proceso.findFirst({
            where: { nombre: hijo.nombre, procesoPadreId: padre.id },
          });

          if (!procesoHijo) {
            // Buscar por nombre en cualquier padre (legacy puede tener estructura diferente)
            procesoHijo = await prisma.proceso.findFirst({
              where: { nombre: hijo.nombre },
            });

            if (procesoHijo) {
              // Existe pero bajo otro padre o sin padre - reasignar
              await prisma.proceso.update({
                where: { id: procesoHijo.id },
                data: { procesoPadreId: padre.id, rutaAcceso: hijo.funcion },
              });
              changes.push(`~ Reasignado: ${hijo.nombre} -> padre ${item.nombre}`);
            }
          }

          if (!procesoHijo) {
            procesoHijo = await prisma.proceso.create({
              data: {
                nombre: hijo.nombre,
                rutaAcceso: hijo.funcion,
                procesoPadreId: padre.id,
                usuarioModId: 0,
              },
            });
            changes.push(`+ Proceso hijo: ${hijo.nombre}`);
          } else if (procesoHijo.rutaAcceso !== hijo.funcion) {
            await prisma.proceso.update({
              where: { id: procesoHijo.id },
              data: { rutaAcceso: hijo.funcion },
            });
            changes.push(`~ Ruta actualizada: ${hijo.nombre} -> ${hijo.funcion}`);
          }

          // Buscar o crear subproceso
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
            changes.push(`+ Subproceso: ${hijo.nombre} -> ${hijo.funcion}`);
          } else if (existingSub.funcion !== hijo.funcion) {
            await prisma.subproceso.update({
              where: { id: existingSub.id },
              data: { funcion: hijo.funcion, nombre: hijo.nombre },
            });
            changes.push(`~ Subproceso actualizado: ${hijo.nombre} -> ${hijo.funcion}`);
          }
        }
      }
    }

    return NextResponse.json({
      message: "Sincronización completada",
      changes,
      totalChanges: changes.length,
    });
  } catch (error) {
    console.error("Error al sincronizar procesos:", error);
    return NextResponse.json(
      { error: "Error al sincronizar procesos" },
      { status: 500 }
    );
  }
}
