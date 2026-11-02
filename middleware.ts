import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { betterAuth } from "better-auth";
import { auth } from "./auth";

// Export the configured instance so middleware can use its utility types
export const { middleware: betterAuthMiddleware } = auth;

// Type extension for NextRequest to include user from better-auth
declare module "better-auth" {
  interface Session {
    user: {
      id: string;
      email: string | null;
      role: "admin" | "parent" | "teacher" | "bursar";
      /** additional fields */
    };
  }
}

export async function middleware(request: NextRequest) {
  const url = request.nextUrl;
  const path = url.pathname;

  // Protect admin routes
  if (path.startsWith("/admin")) {
    // Try to get the session using better-auth helper
    const response = await betterAuthMiddleware({ request });
    // If not authorized, response will be a redirect or null
    if (response) {
      return response; // redirect to login or 403
    }

    // If we reach here, user is not authenticated or not admin
    // Redirect to login or show forbidden
    return NextResponse.redirect(new URL("/login", url));
  }

  // For non-admin routes, just let them pass
  return NextResponse.next();
}

/**
 * Configuration matching Next.js middleware patterns.
 * This file is run on every request matching the paths below.
 */
export const config = {
  // Match all routes under /admin and also /login etc.
  matcher: ["/admin/:path*", "/login", "/api/auth/:path*"],
};