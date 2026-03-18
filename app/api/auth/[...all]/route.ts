import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Obtain the default handlers from better-auth
const handler = toNextJsHandler(auth);

// Helper to detect verification-related requests. This matches common patterns
// used by auth libraries (path containing "verify" or query params).
function isVerificationRequest(url: string) {
  try {
    const u = new URL(url);
    const pathname = u.pathname.toLowerCase();
    const qs = u.searchParams;
    if (pathname.includes("verify") || pathname.includes("verification"))
      return true;
    if (qs.has("token") && (qs.has("type") || qs.has("action"))) return true;
    return false;
  } catch {
    return false;
  }
}

export const GET = async (req: Request) => {
  const res = await handler.GET(req);

  // If this was a verification request, redirect user to the login page
  if (isVerificationRequest(req.url)) {
    // If the handler returned an error status, pass it through
    if (res.status && res.status >= 400) return res;
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }

  return res;
};

export const POST = async (req: Request) => {
  const res = await handler.POST(req);

  if (isVerificationRequest(req.url)) {
    if (res.status && res.status >= 400) return res;
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }

  return res;
};
