/**
 * App-mode configuration.
 *
 * NEXT_PUBLIC_APP_MODE is a CLIENT-VISIBLE presentation hint only.
 *
 * CRITICAL — what this value is NOT:
 *   - NOT authentication: it does not verify who the user is.
 *   - NOT authorization: it does not determine access to private data.
 *   - NOT a security boundary: any client can read NEXT_PUBLIC_* variables.
 *
 * What it MAY be used for:
 *   - Non-sensitive UI presentation differences (e.g., "Demo" banners).
 *   - Toggling illustrative/sample content in clearly labelled UI states.
 *
 * What it MUST NEVER be used for:
 *   - Gating access to private data.
 *   - Deciding whether to return real vs. demo data from server code.
 *   - Any security-relevant decision.
 *
 * Real private/demo data separation:
 *   When a public demo route is eventually added, separation between
 *   private and demo data MUST be enforced server-side by route structure
 *   and server-only data imports — not by reading this variable.
 *   Demo routes must import from lib/demo-data.ts (to be created) and
 *   never from mock-data.ts or any module that could ever hold real data.
 *
 * Defaults to 'private' when unset (safe for local dev).
 */

export type AppMode = "private" | "demo";

export const APP_MODE: AppMode =
  (process.env.NEXT_PUBLIC_APP_MODE as AppMode | undefined) === "demo"
    ? "demo"
    : "private";

export const IS_PRIVATE = APP_MODE === "private";
export const IS_DEMO = APP_MODE === "demo";
