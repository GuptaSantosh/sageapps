/* eslint-disable @typescript-eslint/no-require-imports */
'use strict';

/**
 * scripts/db-backup.js — SQLite online backup using better-sqlite3 .backup() API.
 *
 * Usage: node scripts/db-backup.js
 *
 * Required env vars:
 *   JARVIS_DB_PATH    — absolute path to source SQLite database
 *   JARVIS_BACKUP_DIR — absolute path to directory that will receive the backup file
 *
 * Both vars are read from the environment; if a .env.local file exists in the
 * project root it is parsed manually so this script works without dotenv.
 *
 * Output (stdout) — safe operational info only:
 *   backup file name, file size, integrity check result
 *
 * Exit codes:
 *   0 — backup completed and integrity check passed
 *   1 — any failure (missing vars, missing paths, backup error, integrity failure)
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// ── Load .env.local (dev convenience) ─────────────────────────────────────────

const envLocalPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envLocalPath)) {
  const lines = fs.readFileSync(envLocalPath, 'utf8').split('\n');
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eqIdx = line.indexOf('=');
    if (eqIdx === -1) continue;
    const key = line.slice(0, eqIdx).trim();
    const val = line.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
    if (key && !(key in process.env)) {
      process.env[key] = val;
    }
  }
}

// ── Validate required env vars ─────────────────────────────────────────────────

const dbPath = process.env.JARVIS_DB_PATH;
const backupDir = process.env.JARVIS_BACKUP_DIR;

if (!dbPath) {
  console.error('ERROR: JARVIS_DB_PATH is not set.');
  process.exit(1);
}
if (!backupDir) {
  console.error('ERROR: JARVIS_BACKUP_DIR is not set.');
  process.exit(1);
}

// ── Validate source and destination paths ──────────────────────────────────────

if (!fs.existsSync(dbPath)) {
  console.error(`ERROR: Source database not found: ${dbPath}`);
  process.exit(1);
}
if (!fs.existsSync(backupDir)) {
  console.error(`ERROR: Backup directory not found: ${backupDir}`);
  process.exit(1);
}
const backupDirStat = fs.statSync(backupDir);
if (!backupDirStat.isDirectory()) {
  console.error(`ERROR: JARVIS_BACKUP_DIR is not a directory: ${backupDir}`);
  process.exit(1);
}

// ── Build timestamped filename ─────────────────────────────────────────────────

function buildBackupFilename() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const YYYY = now.getUTCFullYear();
  const MM   = pad(now.getUTCMonth() + 1);
  const DD   = pad(now.getUTCDate());
  const HH   = pad(now.getUTCHours());
  const mm   = pad(now.getUTCMinutes());
  const ss   = pad(now.getUTCSeconds());
  return `jarvis_${YYYY}${MM}${DD}_${HH}${mm}${ss}UTC.db`;
}

const backupFilename = buildBackupFilename();
const backupPath = path.join(backupDir, backupFilename);

if (fs.existsSync(backupPath)) {
  console.error(`ERROR: Backup file already exists (sub-second collision): ${backupPath}`);
  process.exit(1);
}

// ── Perform backup ─────────────────────────────────────────────────────────────

let src = null;
let dst = null;

async function run() {
  try {
    src = new Database(dbPath, { readonly: true, fileMustExist: true });

    // .backup() is async (WAL-safe online backup); returns a Promise.
    await src.backup(backupPath);

    // Verify integrity of the completed backup file.
    dst = new Database(backupPath, { readonly: true, fileMustExist: true });
    const row = dst.prepare('PRAGMA integrity_check').get();
    const integrity = row && row.integrity_check;

    if (integrity !== 'ok') {
      throw new Error(`Integrity check failed: ${integrity}`);
    }

    const sizeBytes = fs.statSync(backupPath).size;
    const sizeKb = (sizeBytes / 1024).toFixed(1);

    console.log(`Backup:    ${backupFilename}`);
    console.log(`Size:      ${sizeKb} KB`);
    console.log(`Integrity: ${integrity}`);
  } catch (err) {
    console.error(`ERROR: ${err.message}`);
    // Clean up incomplete/corrupt backup file.
    try {
      if (fs.existsSync(backupPath)) fs.unlinkSync(backupPath);
    } catch {
      // Best-effort cleanup; don't mask the original error.
    }
    process.exit(1);
  } finally {
    if (dst) { try { dst.close(); } catch { /* ignore */ } }
    if (src) { try { src.close(); } catch { /* ignore */ } }
  }
}

run();
