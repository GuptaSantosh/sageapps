/**
 * lib/db/index.ts — Lazy singleton better-sqlite3 connection with Drizzle ORM.
 *
 * Rules enforced here:
 *  - server-only: crashes the build if accidentally imported in a Client Component or Edge runtime.
 *  - Lazy: getDb() opens the file only on first call; importing this module is a no-op at build time.
 *  - WAL mode: PRAGMA journal_mode = WAL (better concurrent read performance).
 *  - Foreign keys: PRAGMA foreign_keys = ON (enforces ON DELETE CASCADE in schema).
 *  - Prod fail-closed: missing JARVIS_DB_PATH in production throws immediately, never silently.
 *  - Dev fallback: uses local data/jarvis.dev.db when JARVIS_DB_PATH is unset (dev only).
 *  - HMR singleton: stores the connection on globalThis.__jarvisDb so Next.js hot-reload
 *    does not open a new file handle on every module refresh.
 *  - Never runs migrations automatically: migrations must be run explicitly via
 *    `npx drizzle-kit migrate` as a controlled deploy step.
 */

import "server-only";

import Database from "better-sqlite3";
import { drizzle, BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

type JarvisDb = BetterSQLite3Database<typeof schema>;

// Extend globalThis for the HMR singleton (dev only; production has one process lifetime).
declare global {
  var __jarvisDb: JarvisDb | undefined;
}

function openDatabase(): JarvisDb {
  const isProd = process.env.NODE_ENV === "production";
  const dbPath = process.env.JARVIS_DB_PATH;

  if (isProd && !dbPath) {
    throw new Error(
      "[jarvis/db] JARVIS_DB_PATH is not set. " +
        "Set it in .env.local to the absolute path of the SQLite database file " +
        "(e.g. /home/jarvis/data/jarvis.db) before starting the application."
    );
  }

  const resolvedPath = dbPath ?? "data/jarvis.dev.db";

  const client = new Database(resolvedPath);

  // WAL mode: allows concurrent readers while a write is in progress.
  client.pragma("journal_mode = WAL");

  // Foreign keys: SQLite disables them by default; enabling enforces cascade deletes.
  client.pragma("foreign_keys = ON");

  return drizzle(client, { schema });
}

export function getDb(): JarvisDb {
  if (process.env.NODE_ENV !== "production") {
    // In development, reuse the same connection across HMR module refreshes.
    if (!globalThis.__jarvisDb) {
      globalThis.__jarvisDb = openDatabase();
    }
    return globalThis.__jarvisDb;
  }

  // In production there is a single long-lived process; open once and keep it.
  // Using a module-level variable is fine: the module is loaded exactly once.
  if (!_prodDb) {
    _prodDb = openDatabase();
  }
  return _prodDb;
}

// Module-level singleton for production (never used in dev).
let _prodDb: JarvisDb | undefined;
