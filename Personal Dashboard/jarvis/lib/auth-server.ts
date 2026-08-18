/**
 * auth-server.ts — server-only authentication helper.
 *
 * Use this in every private route handler and server action that reads data
 * or performs an operation. Do not rely on proxy.ts alone for authorization.
 *
 * Usage:
 *   import { requireAuth } from "@/lib/auth-server";
 *
 *   export async function GET() {
 *     const session = await requireAuth(); // redirects to /login if not authed
 *     // session.user.githubId is the authorized GitHub numeric ID
 *     ...
 *   }
 *
 *   export async function myServerAction() {
 *     "use server";
 *     const session = await requireAuth();
 *     ...
 *   }
 *
 * This file is server-only. The "server-only" import ensures it cannot be
 * accidentally imported by a client component (TypeScript + bundler will error).
 */

import "server-only";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import type { Session } from "next-auth";

/**
 * requireAuth — asserts the caller is the authenticated owner.
 *
 * Returns the session on success.
 * Redirects to /login (server-side 307) if there is no valid session.
 * Never returns null — if execution continues, the session is guaranteed.
 */
export async function requireAuth(): Promise<Session> {
  const session = await auth();
  if (!session) {
    redirect("/login");
  }
  return session;
}
