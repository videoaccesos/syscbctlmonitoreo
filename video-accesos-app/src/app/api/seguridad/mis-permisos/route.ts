import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/seguridad/mis-permisos
 * Retorna las rutas autorizadas del usuario logueado basado en sus grupos y permisos.
 * Si el usuario pertenece al grupo "admin" (case-insensitive), retorna acceso total.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const usuarioId = session.user.usuarioId;

    // Obtener los grupos del usuario
    const gruposDetalles = await prisma.grupoUsuarioDetalle.findMany({
      where: { usuarioId },
      include: {
        grupo: {
          include: {
            permisos: {
              include: {
                subproceso: {
                  include: {
                    proceso: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const grupos = gruposDetalles.map((d) => ({
      id: d.grupo.id,
      nombre: d.grupo.nombre,
      estatusId: d.grupo.estatusId,
    }));

    // Verificar si el usuario pertenece al grupo "admin" (case-insensitive)
    const isAdmin = gruposDetalles.some(
      (d) => d.grupo.nombre.toLowerCase() === "admin" && d.grupo.estatusId === 1
    );

    if (isAdmin) {
      // Admin tiene acceso total - obtener todas las rutas
      const allProcesos = await prisma.proceso.findMany({
        include: { subprocesos: true },
      });

      const rutasAutorizadas = allProcesos
        .filter((p) => p.rutaAcceso)
        .map((p) => p.rutaAcceso as string);

      // Agregar rutas de subprocesos que tengan funcion como ruta
      allProcesos.forEach((p) => {
        p.subprocesos.forEach((s) => {
          if (s.funcion) rutasAutorizadas.push(s.funcion);
        });
      });

      console.log(
        `[PERMISOS] Usuario ID=${usuarioId} es ADMIN - acceso total. Grupos: [${grupos.map((g) => g.nombre).join(", ")}]`
      );

      return NextResponse.json({
        isAdmin: true,
        grupos,
        rutasAutorizadas: [...new Set(rutasAutorizadas)],
        ramaNombres: allProcesos.map((p) => p.nombre),
      });
    }

    // Usuario normal - recopilar rutas de los permisos de sus grupos activos
    const rutasSet = new Set<string>();
    const ramaNombresSet = new Set<string>();

    gruposDetalles.forEach((d) => {
      if (d.grupo.estatusId !== 1) return; // Solo grupos activos
      d.grupo.permisos.forEach((permiso) => {
        const proceso = permiso.subproceso.proceso;
        if (proceso.rutaAcceso) {
          rutasSet.add(proceso.rutaAcceso);
        }
        ramaNombresSet.add(proceso.nombre);
        if (permiso.subproceso.funcion) {
          rutasSet.add(permiso.subproceso.funcion);
        }
      });
    });

    const rutasAutorizadas = Array.from(rutasSet);
    const ramaNombres = Array.from(ramaNombresSet);

    console.log(
      `[PERMISOS] Usuario ID=${usuarioId} - Grupos: [${grupos.map((g) => g.nombre).join(", ")}] - Ramas autorizadas: [${ramaNombres.join(", ")}]`
    );

    return NextResponse.json({
      isAdmin: false,
      grupos,
      rutasAutorizadas,
      ramaNombres,
    });
  } catch (error) {
    console.error("Error al obtener permisos del usuario:", error);
    return NextResponse.json(
      { error: "Error al obtener permisos" },
      { status: 500 }
    );
  }
}
