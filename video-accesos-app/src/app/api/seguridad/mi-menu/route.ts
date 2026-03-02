import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/seguridad/mi-menu
 *
 * Retorna las rutas de menu permitidas para el usuario autenticado.
 * Replica la logica del sistema legacy PHP (menu.php):
 *   usuario -> grupos_usuarios_detalles -> grupos_usuarios (estatus=1)
 *   -> permisos_acceso -> subprocesos -> procesos
 *
 * Retorna:
 * - allowedRoutes: string[] de rutas permitidas (e.g. ["/catalogos/privadas", ...])
 * - menuTree: estructura jerarquica para el sidebar
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const usuarioId = session.user.usuarioId;

    // Obtener todos los subprocesos permitidos para este usuario
    // a traves de sus grupos (replica la query del PHP legacy)
    const permisosResult = await prisma.$queryRawUnsafe<
      Array<{
        subproceso_id: number;
        subproceso_nombre: string;
        funcion: string | null;
        proceso_id: number;
        proceso_nombre: string;
        ruta_acceso: string | null;
        proceso_padre_id: number | null;
      }>
    >(`
      SELECT DISTINCT
        sp.subproceso_id,
        sp.nombre AS subproceso_nombre,
        sp.funcion,
        p.proceso_id,
        p.nombre AS proceso_nombre,
        p.ruta_acceso,
        p.proceso_padre_id
      FROM subprocesos sp
      INNER JOIN permisos_acceso pa ON pa.subproceso_id = sp.subproceso_id
      INNER JOIN grupos_usuarios gu ON gu.grupo_usuario_id = pa.grupo_usuario_id
      INNER JOIN grupos_usuarios_detalles gud ON gud.grupo_usuario_id = gu.grupo_usuario_id
      INNER JOIN procesos p ON p.proceso_id = sp.proceso_id
      WHERE gud.usuario_id = ?
        AND gu.estatus_id = 1
      ORDER BY p.proceso_id, sp.subproceso_id
    `, usuarioId);

    // Extraer rutas permitidas de las funciones de subprocesos y rutas de procesos
    const allowedRoutes = new Set<string>();

    for (const row of permisosResult) {
      if (row.funcion) {
        allowedRoutes.add(row.funcion);
      }
      if (row.ruta_acceso) {
        allowedRoutes.add(row.ruta_acceso);
      }
    }

    // Construir el arbol de menu
    // Obtener los procesos padre de los procesos permitidos
    const procesoIds = new Set(permisosResult.map((r) => r.proceso_id));

    // Obtener procesos padre
    const padreIds = new Set<number>();
    for (const row of permisosResult) {
      if (row.proceso_padre_id && row.proceso_padre_id > 0) {
        padreIds.add(row.proceso_padre_id);
      }
    }

    // Consultar los procesos padre
    const padres = padreIds.size > 0
      ? await prisma.proceso.findMany({
          where: { id: { in: Array.from(padreIds) } },
          orderBy: { id: "asc" },
        })
      : [];

    // Construir arbol de menu
    interface MenuNode {
      id: number;
      nombre: string;
      rutaAcceso: string | null;
      hijos: { id: number; nombre: string; rutaAcceso: string | null }[];
    }

    const menuTree: MenuNode[] = [];
    const padreMap = new Map<number, MenuNode>();

    // Agregar padres al arbol
    for (const padre of padres) {
      const node: MenuNode = {
        id: padre.id,
        nombre: padre.nombre,
        rutaAcceso: padre.rutaAcceso,
        hijos: [],
      };
      padreMap.set(padre.id, node);
      menuTree.push(node);
    }

    // Agregar procesos como hijos o como nodos raiz
    for (const row of permisosResult) {
      if (row.proceso_padre_id && row.proceso_padre_id > 0) {
        const parentNode = padreMap.get(row.proceso_padre_id);
        if (parentNode) {
          // Evitar duplicados
          if (!parentNode.hijos.some((h) => h.id === row.proceso_id)) {
            parentNode.hijos.push({
              id: row.proceso_id,
              nombre: row.proceso_nombre,
              rutaAcceso: row.ruta_acceso || row.funcion,
            });
          }
        }
      } else {
        // Proceso sin padre = item de menu directo
        if (!menuTree.some((m) => m.id === row.proceso_id)) {
          menuTree.push({
            id: row.proceso_id,
            nombre: row.proceso_nombre,
            rutaAcceso: row.ruta_acceso || row.funcion,
            hijos: [],
          });
        }
      }
    }

    return NextResponse.json({
      allowedRoutes: Array.from(allowedRoutes),
      menuTree,
    });
  } catch (error) {
    console.error("Error al obtener menu del usuario:", error);
    return NextResponse.json(
      { error: "Error al obtener menu" },
      { status: 500 }
    );
  }
}
