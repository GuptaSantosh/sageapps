/**
 * proxy.ts — Next.js 16 first-line access gate.
 *
 * IMPORTANT: This is the early-redirect layer only. It is NOT the sole
 * authorization control. Authentication is also enforced in:
 *   - app/(private)/layout.tsx  — server-side session check for all private pages
 *   - lib/auth-server.ts        — reusable helper for future route handlers / server actions
 *
 * Changing the matcher here (or removing this file) does NOT remove protection.
 * The private layout enforces auth independently.
 *
 * Proxy runs at the Node.js runtime (Next.js 16 default).
 * Auth.js `auth()` can be called here without any Edge-runtime restrictions.
 *
 * Future demo route note:
 *   A future public /demo route must be excluded from this matcher AND must
 *   use entirely separate demo-only data sources. It must never expose private
 *   data, regardless of what mode environment variables say.
 */

import { auth } from "@/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const session = await auth();

  if (!session) {
    const loginUrl = new URL("/login", request.url);

    // Preserve the originally requested path so the login page can redirect
    // back after successful authentication.
    //
    // Safety: only accept paths that start with "/" and contain no "//"
    // (which would indicate a protocol-relative external URL attempt).
    const intended = request.nextUrl.pathname;
    if (
      intended.startsWith("/") &&
      !intended.startsWith("//") &&
      intended !== "/login"
    ) {
      loginUrl.searchParams.set("callbackUrl", intended);
    }

    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     *   - /login         — the public sign-in page
     *   - /api/auth/**   — Auth.js OAuth endpoints (must be public)
     *   - _next/static   — Next.js static asset chunks
     *   - _next/image    — Next.js image optimization
     *   - favicon.ico    — browser favicon
     *   - *.svg / *.png / *.ico / *.webmanifest — static public assets
     */
    "/((?!login|api/auth|_next/static|_next/image|favicon\\.ico|.*\\.svg$|.*\\.png$|.*\\.ico$|.*\\.webmanifest$).*)",
  ],
};
