/**
 * App-mode configuration.
 *
 * PRIVATE — Santosh's real command center. Shows real agent state, real data once wired.
 * DEMO    — Sanitized interactive demo for prospective users. Only uses fictional/demo data.
 *
 * Set via environment variable: NEXT_PUBLIC_APP_MODE=private|demo
 * Defaults to 'private' when unset (safe for local dev).
 *
 * When building real data wiring: check APP_MODE before returning any private data.
 * Public demo routes should import from lib/demo-data.ts (to be created), never mock-data.ts.
 */

export type AppMode = 'private' | 'demo';

export const APP_MODE: AppMode =
  (process.env.NEXT_PUBLIC_APP_MODE as AppMode | undefined) === 'demo'
    ? 'demo'
    : 'private';

export const IS_PRIVATE = APP_MODE === 'private';
export const IS_DEMO = APP_MODE === 'demo';
