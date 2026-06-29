import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Coming-soon, unlock API, and admin routes bypass the site lock
  if (
    pathname.startsWith("/coming-soon") ||
    pathname.startsWith("/api/unlock") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/api/admin") ||
    pathname.startsWith("/api/keepalive")
  ) {
    return NextResponse.next();
  }

  const auth = request.cookies.get("theview_auth");
  if (!auth || auth.value !== "true") {
    return NextResponse.redirect(new URL("/coming-soon", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Exclude Next.js internals and all static assets from middleware
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico)).*)",
  ],
};
