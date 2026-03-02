/**
 * Configuracion centralizada del menu del sistema.
 * Define la estructura de procesos/subprocesos que corresponden
 * a las rutas reales de la aplicacion Next.js.
 *
 * Esta configuracion se usa para:
 * 1. Sincronizar la tabla procesos/subprocesos en BD
 * 2. Construir el sidebar dinamico basado en permisos
 * 3. Validar acceso a rutas en middleware
 */

export interface MenuSubItem {
  nombre: string;
  funcion: string; // ruta relativa, e.g. "/catalogos/privadas"
}

export interface MenuItem {
  nombre: string;
  rutaAcceso: string | null; // ruta directa (solo items sin hijos)
  hijos?: MenuSubItem[];
}

/**
 * Estructura del menu del sistema.
 * Cada entrada de nivel superior es un "proceso padre" (proceso_padre_id = 0).
 * Cada hijo es un "proceso" con sus "subprocesos".
 *
 * Para items que tienen hijos, cada hijo se mapea como:
 * - Un proceso hijo (proceso_padre_id = padre.id)
 * - Un subproceso dentro de ese proceso hijo (funcion = ruta)
 */
export const MENU_CONFIG: MenuItem[] = [
  {
    nombre: "Inicio",
    rutaAcceso: "/",
  },
  {
    nombre: "Terminal de Monitoreo",
    rutaAcceso: "/procesos/monitoristas",
  },
  {
    nombre: "Catálogos",
    rutaAcceso: null,
    hijos: [
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
    hijos: [
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
    hijos: [
      { nombre: "Accesos Consultas", funcion: "/reportes/accesos-consultas" },
      { nombre: "Accesos Gráficas", funcion: "/reportes/accesos-graficas" },
      { nombre: "Supervisión Llamadas", funcion: "/reportes/supervision-llamadas" },
    ],
  },
  {
    nombre: "Seguridad",
    rutaAcceso: null,
    hijos: [
      { nombre: "Usuarios", funcion: "/seguridad/usuarios" },
      { nombre: "Grupos de Usuario", funcion: "/seguridad/grupos-usuarios" },
      { nombre: "Permisos de Acceso", funcion: "/seguridad/permisos" },
    ],
  },
];

/**
 * Mapa plano de ruta -> nombre para lookup rapido.
 */
export function buildRouteMap(): Map<string, string> {
  const map = new Map<string, string>();
  for (const item of MENU_CONFIG) {
    if (item.rutaAcceso) {
      map.set(item.rutaAcceso, item.nombre);
    }
    if (item.hijos) {
      for (const hijo of item.hijos) {
        map.set(hijo.funcion, hijo.nombre);
      }
    }
  }
  return map;
}

/**
 * Todas las rutas protegidas del sistema (excluyendo "/" que siempre es accesible).
 */
export function getAllProtectedRoutes(): string[] {
  const routes: string[] = [];
  for (const item of MENU_CONFIG) {
    if (item.rutaAcceso && item.rutaAcceso !== "/") {
      routes.push(item.rutaAcceso);
    }
    if (item.hijos) {
      for (const hijo of item.hijos) {
        routes.push(hijo.funcion);
      }
    }
  }
  return routes;
}
