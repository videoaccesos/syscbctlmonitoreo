import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

/**
 * Rutas que NUNCA se bloquean para usuarios autenticados.
 * Esto evita lockout permanente: si un admin configura mal los permisos,
 * siempre puede llegar a Seguridad para arreglarlos.
 */
const ANTI_LOCKOUT_ROUTES = [
  "/seguridad/usuarios",
  "/seguridad/grupos-usuarios",
  "/seguridad/permisos",
];

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    // API routes and root always allowed for authenticated users
    if (pathname.startsWith("/api/") || pathname === "/") {
      return NextResponse.next();
    }

    // Anti-lockout: Seguridad routes are always accessible to prevent
    // permanent lockout when permissions are misconfigured
    if (ANTI_LOCKOUT_ROUTES.some(
      (route) => pathname === route || pathname.startsWith(route + "/")
    )) {
      return NextResponse.next();
    }

    const allowedRoutes = (token?.allowedRoutes as string[]) || [];

    // If no permissions configured yet (empty array), allow everything
    // to avoid locking out users during initial setup
    if (allowedRoutes.length === 0) {
      return NextResponse.next();
    }

    // Only consider valid Next.js routes (must start with "/")
    // This filters out legacy PHP function names like "listar", "editar", etc.
    const validRoutes = allowedRoutes.filter((r) => r.startsWith("/"));

    // If no valid routes remain after filtering, treat as bootstrap mode
    if (validRoutes.length === 0) {
      return NextResponse.next();
    }

    // Check if the current path matches any allowed route
    const isAllowed = validRoutes.some(
      (route) => pathname === route || pathname.startsWith(route + "/")
    );

    if (!isAllowed) {
      // Redirect to home with an access denied indicator
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
