/**
 * Auth.js v5 route handler.
 *
 * Handles all /api/auth/* requests:
 *   GET/POST /api/auth/signin
 *   GET/POST /api/auth/signout
 *   GET/POST /api/auth/callback/github
 *   GET      /api/auth/session
 *   GET      /api/auth/csrf
 *
 * This route MUST remain publicly accessible (no auth check here).
 * The proxy.ts matcher explicitly excludes /api/auth/** from protection.
 */

import { handlers } from "@/auth";

export const { GET, POST } = handlers;

// Opt out of static caching — auth responses must always be dynamic
export const dynamic = "force-dynamic";
