import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

// Rutas que no requieren permisos (accesibles para cualquier usuario autenticado)
const RUTAS_PUBLICAS = new Set(["/", "/login"]);

// Mapeo de rutas de API a la ruta de página que las protege.
// Si un API no está aquí, se permite a cualquier usuario autenticado.
const API_RUTA_PERMISO: Record<string, string> = {
  "/api/herramientas/conciliacion": "/herramientas/conciliacion",
  "/api/procesos/correccion-vencimientos": "/procesos/correccion-vencimientos",
  "/api/procesos/prenomina": "/procesos/prenomina",
  "/api/procesos/mensualidades": "/procesos/mensualidades",
  "/api/procesos/gastos": "/procesos/gastos",
  "/api/procesos/asignacion-tarjetas": "/procesos/asignacion-tarjetas",
  "/api/procesos/ordenes-servicio": "/procesos/ordenes-servicio",
  "/api/procesos/supervision-llamadas": "/procesos/supervision-llamadas",
  "/api/reportes/accesos-consultas": "/reportes/accesos-consultas",
  "/api/reportes/accesos-graficas": "/reportes/accesos-graficas",
  "/api/reportes/supervision-llamadas": "/reportes/supervision-llamadas",
  "/api/reportes/reporte-ventas": "/reportes/reporte-ventas",
  "/api/reportes/tarjetas-vencimientos": "/reportes/tarjetas-vencimientos",
  "/api/reportes/catalogo-tarjetas": "/reportes/catalogo-tarjetas",
  "/api/seguridad/usuarios": "/seguridad/usuarios",
  "/api/seguridad/grupos-usuarios": "/seguridad/grupos-usuarios",
  "/api/seguridad/permisos": "/seguridad/permisos",
  "/api/seguridad/sync-procesos": "/seguridad/permisos",
  "/api/catalogos/privadas": "/catalogos/privadas",
  "/api/catalogos/residencias": "/catalogos/residencias",
  "/api/catalogos/empleados": "/catalogos/empleados",
  "/api/catalogos/tarjetas": "/catalogos/tarjetas",
  "/api/catalogos/puestos": "/catalogos/puestos",
  "/api/catalogos/turnos": "/catalogos/turnos",
  "/api/catalogos/fallas": "/catalogos/fallas",
  "/api/catalogos/materiales": "/catalogos/materiales",
  "/api/catalogos/cuentas-gasto": "/catalogos/cuentas-gasto",
};

// APIs de catálogos: GET es accesible para cualquier usuario autenticado,
// solo POST/PUT/DELETE requieren permiso de catálogo.
const CATALOGOS_LECTURA_LIBRE = new Set([
  "/api/catalogos/privadas",
  "/api/catalogos/residencias",
  "/api/catalogos/empleados",
  "/api/catalogos/tarjetas",
  "/api/catalogos/puestos",
  "/api/catalogos/turnos",
  "/api/catalogos/fallas",
  "/api/catalogos/materiales",
  "/api/catalogos/cuentas-gasto",
]);

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

    // Rutas públicas: accesibles a cualquier usuario autenticado
    if (RUTAS_PUBLICAS.has(pathname)) {
      return NextResponse.next();
    }

    // Si no hay token (no debería pasar con withAuth, pero por seguridad)
    if (!token) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    // Admins tienen acceso total
    if (token.isAdmin) {
      return NextResponse.next();
    }

    const rutasAutorizadas = (token.rutasAutorizadas as string[]) || [];

    // Verificar rutas de API protegidas
    if (pathname.startsWith("/api/")) {
      // Catálogos: GET es libre para cualquier usuario autenticado
      if (req.method === "GET") {
        const esCatalogoLibre = CATALOGOS_LECTURA_LIBRE.has(pathname) ||
          [...CATALOGOS_LECTURA_LIBRE].some((cat) => pathname.startsWith(cat + "/"));
        if (esCatalogoLibre) {
          return NextResponse.next();
        }
      }

      // Buscar si este API path tiene un permiso asociado
      // Intentar match exacto primero, luego por prefijo
      const permisoRequerido =
        API_RUTA_PERMISO[pathname] ||
        Object.entries(API_RUTA_PERMISO).find(([apiPath]) =>
          pathname.startsWith(apiPath + "/")
        )?.[1];

      if (permisoRequerido && !rutasAutorizadas.includes(permisoRequerido)) {
        return NextResponse.json(
          { error: "No tiene permiso para acceder a este recurso" },
          { status: 403 }
        );
      }
      return NextResponse.next();
    }

    // Verificar rutas de página (dashboard)
    // Verificar si la ruta actual coincide con alguna ruta autorizada
    const tienePermiso = rutasAutorizadas.some(
      (ruta) => pathname === ruta || pathname.startsWith(ruta + "/")
    );

    if (!tienePermiso) {
      // Redirigir a inicio con mensaje
      const url = new URL("/", req.url);
      url.searchParams.set("forbidden", "1");
      return NextResponse.redirect(url);
    }

    return NextResponse.next();
  },
  {
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  matcher: [
    "/((?!login|api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
};
