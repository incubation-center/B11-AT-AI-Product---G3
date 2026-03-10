import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

const AUTH_ROUTES = [
  "/sign-in",
  "/sign-up",
  "/login",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/resend-verification",
];

const PROTECTED_ROUTES = ["/dashboard"];

const hasRoutePrefix = (pathname: string, route: string) =>
  pathname === route || pathname.startsWith(`${route}/`);

const getSessionToken = (request: NextRequest) => {
  const fromLibrary = getSessionCookie(request);
  if (fromLibrary) return fromLibrary;

  // Fallback to known better-auth cookie names (secure + non-secure).
  return (
    request.cookies.get("better-auth.session_token")?.value ||
    request.cookies.get("__Secure-better-auth.session_token")?.value ||
    null
  );
};

export async function proxy(request: NextRequest) {
  const sessionToken = getSessionToken(request);
  const isAuthenticated = Boolean(sessionToken);
  const { pathname, search } = request.nextUrl;

  const isAuthRoute = AUTH_ROUTES.some((route) => hasRoutePrefix(pathname, route));
  const isProtectedRoute = PROTECTED_ROUTES.some((route) =>
    hasRoutePrefix(pathname, route),
  );

  // If user is already signed in, keep auth pages inaccessible.
  if (isAuthRoute && isAuthenticated) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Enforce auth on protected pages.
  if (isProtectedRoute && !isAuthenticated) {
    const callbackUrl = `${pathname}${search}`;
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("callbackUrl", callbackUrl);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/sign-in",
    "/sign-up",
    "/login",
    "/forgot-password",
    "/reset-password",
    "/verify-email",
    "/resend-verification",
  ],
};