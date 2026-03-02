import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    // API routes and root always allowed for authenticated users
    if (pathname.startsWith("/api/") || pathname === "/") {
      return NextResponse.next();
    }

    const allowedRoutes = (token?.allowedRoutes as string[]) || [];

    // If no permissions configured yet (empty array), allow everything
    // to avoid locking out users during initial setup
    if (allowedRoutes.length === 0) {
      return NextResponse.next();
    }

    // Check if the current path matches any allowed route
    const isAllowed = allowedRoutes.some(
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
