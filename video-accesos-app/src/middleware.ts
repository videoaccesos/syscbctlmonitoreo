import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

/**
 * Expande las rutas permitidas con reglas implicitas:
 * - Si tiene /seguridad/* -> incluir /seguridad/permisos (anti-lockout)
 * - Si tiene /procesos/*  -> incluir /procesos/monitoristas
 */
function expandirRutas(allowedRoutes: string[]): string[] {
  const expanded = new Set(allowedRoutes);

  const tieneSeguridad = allowedRoutes.some((r) => r.startsWith("/seguridad/"));
  if (tieneSeguridad) {
    expanded.add("/seguridad/permisos");
  }

  const tieneProcesos = allowedRoutes.some((r) => r.startsWith("/procesos/"));
  if (tieneProcesos) {
    expanded.add("/procesos/monitoristas");
  }

  return Array.from(expanded);
}

/**
 * Verifica si una ruta esta permitida para el usuario segun sus allowedRoutes.
 * Retorna true si tiene acceso, false si no.
 */
function tieneAccesoARuta(allowedRoutes: string[], pathname: string): boolean {
  // Modo bootstrap: no hay permisos configurados, permitir todo
  if (allowedRoutes.length === 0) {
    return true;
  }

  // Solo considerar rutas Next.js validas (empiezan con "/")
  const validRoutes = allowedRoutes.filter((r) => r.startsWith("/"));

  // Si no quedan rutas validas despues de filtrar, modo bootstrap
  if (validRoutes.length === 0) {
    return true;
  }

  // Expandir con rutas implicitas
  const expandedRoutes = expandirRutas(validRoutes);

  return expandedRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );
}

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    // Root/dashboard siempre permitido para usuarios autenticados
    if (pathname === "/") {
      return NextResponse.next();
    }

    const allowedRoutes = (token?.allowedRoutes as string[]) || [];

    // Rutas API: verificar permisos mapeando /api/X → /X
    if (pathname.startsWith("/api/")) {
      // /api/auth/* se excluye via matcher, pero por seguridad:
      if (pathname.startsWith("/api/auth/")) {
        return NextResponse.next();
      }

      // /api/dashboard siempre permitido para autenticados
      if (pathname.startsWith("/api/dashboard")) {
        return NextResponse.next();
      }

      // Mapear /api/catalogos/empleados → /catalogos/empleados
      const rutaLogica = pathname.replace(/^\/api/, "");

      if (!tieneAccesoARuta(allowedRoutes, rutaLogica)) {
        return NextResponse.json(
          { error: "No tiene permisos para acceder a este recurso" },
          { status: 403 }
        );
      }

      return NextResponse.next();
    }

    // Rutas de pagina: verificar permisos
    if (!tieneAccesoARuta(allowedRoutes, pathname)) {
      const url = req.nextUrl.clone();
      url.pathname = "/";
      url.searchParams.set("acceso", "denegado");
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
