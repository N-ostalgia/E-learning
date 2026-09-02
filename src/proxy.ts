// src/proxy.ts (Next.js 16 - middleware entry point)
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

export function proxy(request: NextRequest) {
  const sessionToken = getSessionCookie(request);
  const isAuthenticated = !!sessionToken;

  const pathname = request.nextUrl.pathname;

  // Public pages
  const publicPages = ["/", "/login", "/register", "/forgot-password", "/reset-password"];

  // Protected dashboard pages (auth required)
  const dashboardPages = [
    "/feed",
    "/courses",
    "/messages",
    "/communities",
"/events",
    "/profile",
    "/admin",
    "/notifications",
  ];

  const isPublicPage = publicPages.some((page) => pathname === page);
  const isDashboardPage = dashboardPages.some((page) => pathname.startsWith(page));

  // If trying to access dashboard without auth → redirect to login
  if (!isAuthenticated && isDashboardPage) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // If authenticated and trying to access auth pages → redirect to feed
  if (isAuthenticated && (pathname === "/login" || pathname === "/register")) {
    return NextResponse.redirect(new URL("/feed", request.url));
  }

  // If not authenticated and trying to access non-public page → redirect to /
  if (!isAuthenticated && !isPublicPage) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};