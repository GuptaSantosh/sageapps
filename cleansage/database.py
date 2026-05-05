import os
import sqlite3
import json
from datetime import datetime

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
DB_PATH = os.path.join(DATA_DIR, "cleansage.db")

os.makedirs(DATA_DIR, exist_ok=True)


def _conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    with _conn() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS users (
                user_id     TEXT PRIMARY KEY,
                email       TEXT,
                created_at  TIMESTAMP,
                last_scan   TIMESTAMP,
                persona     TEXT,
                onboarding_done BOOLEAN DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS scan_results (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id         TEXT,
                scanned_at      TIMESTAMP,
                gmail_gb        REAL,
                drive_gb        REAL,
                photos_gb       REAL,
                total_gb        REAL,
                breakdown_json  TEXT
            );

            CREATE TABLE IF NOT EXISTS tips (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id     TEXT,
                tip_key     TEXT,
                tip_json    TEXT,
                status      TEXT DEFAULT 'active',
                created_at  TIMESTAMP,
                updated_at  TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS deleted_items (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id     TEXT,
                message_id  TEXT,
                sender      TEXT,
                subject     TEXT,
                size_mb     REAL,
                deleted_at  TIMESTAMP,
                action_type TEXT,
                recoverable BOOLEAN DEFAULT 1
            );
        """)


# ── Users ──────────────────────────────────────────────────────────────────────

def get_user(user_id: str) -> dict | None:
    with _conn() as conn:
        row = conn.execute(
            "SELECT * FROM users WHERE user_id = ?", (user_id,)
        ).fetchone()
    return dict(row) if row else None


def create_user(user_id: str, email: str) -> dict:
    now = datetime.utcnow().isoformat()
    with _conn() as conn:
        conn.execute(
            """INSERT OR IGNORE INTO users (user_id, email, created_at)
               VALUES (?, ?, ?)""",
            (user_id, email, now),
        )
    return get_user(user_id)


def update_user(user_id: str, **fields) -> None:
    allowed = {"email", "last_scan", "persona", "onboarding_done"}
    updates = {k: v for k, v in fields.items() if k in allowed}
    if not updates:
        return
    placeholders = ", ".join(f"{k} = ?" for k in updates)
    values = list(updates.values()) + [user_id]
    with _conn() as conn:
        conn.execute(
            f"UPDATE users SET {placeholders} WHERE user_id = ?", values
        )


# ── Scan results ───────────────────────────────────────────────────────────────

def save_scan_result(
    user_id: str,
    gmail_gb: float,
    drive_gb: float,
    photos_gb: float,
    breakdown: dict,
) -> None:
    total_gb = round(gmail_gb + drive_gb + photos_gb, 4)
    now = datetime.utcnow().isoformat()
    with _conn() as conn:
        conn.execute(
            """INSERT INTO scan_results
               (user_id, scanned_at, gmail_gb, drive_gb, photos_gb, total_gb, breakdown_json)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (user_id, now, gmail_gb, drive_gb, photos_gb, total_gb, json.dumps(breakdown)),
        )
    update_user(user_id, last_scan=now)


def get_latest_scan(user_id: str) -> dict | None:
    with _conn() as conn:
        row = conn.execute(
            """SELECT * FROM scan_results WHERE user_id = ?
               ORDER BY scanned_at DESC LIMIT 1""",
            (user_id,),
        ).fetchone()
    if not row:
        return None
    result = dict(row)
    result["breakdown"] = json.loads(result.pop("breakdown_json", "{}"))
    return result


# ── Tips ───────────────────────────────────────────────────────────────────────

def save_tip(user_id: str, tip_key: str, tip: dict) -> None:
    now = datetime.utcnow().isoformat()
    with _conn() as conn:
        existing = conn.execute(
            "SELECT id FROM tips WHERE user_id = ? AND tip_key = ?",
            (user_id, tip_key),
        ).fetchone()
        if existing:
            conn.execute(
                "UPDATE tips SET tip_json = ?, updated_at = ? WHERE user_id = ? AND tip_key = ?",
                (json.dumps(tip), now, user_id, tip_key),
            )
        else:
            conn.execute(
                """INSERT INTO tips (user_id, tip_key, tip_json, status, created_at, updated_at)
                   VALUES (?, ?, ?, 'active', ?, ?)""",
                (user_id, tip_key, json.dumps(tip), now, now),
            )


def get_tips(user_id: str, status: str | None = None) -> list[dict]:
    with _conn() as conn:
        if status:
            rows = conn.execute(
                "SELECT * FROM tips WHERE user_id = ? AND status = ? ORDER BY created_at DESC",
                (user_id, status),
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM tips WHERE user_id = ? ORDER BY created_at DESC",
                (user_id,),
            ).fetchall()
    results = []
    for row in rows:
        tip = dict(row)
        tip["tip"] = json.loads(tip.pop("tip_json", "{}"))
        results.append(tip)
    return results


# ── Deleted items ──────────────────────────────────────────────────────────────

def log_deletion(
    user_id: str,
    message_id: str,
    sender: str,
    subject: str,
    size_mb: float,
    action_type: str,
    recoverable: bool = True,
) -> None:
    now = datetime.utcnow().isoformat()
    with _conn() as conn:
        conn.execute(
            """INSERT OR IGNORE INTO deleted_items
               (user_id, message_id, sender, subject, size_mb, deleted_at, action_type, recoverable)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (user_id, message_id, sender, subject, size_mb, now, action_type, int(recoverable)),
        )


def get_deleted_items(user_id: str, days: int = 30) -> list[dict]:
    cutoff = datetime.utcnow().replace(
        hour=0, minute=0, second=0, microsecond=0
    ).isoformat()
    # crude cutoff: filter by days using strftime comparison
    with _conn() as conn:
        rows = conn.execute(
            """SELECT * FROM deleted_items
               WHERE user_id = ?
                 AND deleted_at >= datetime('now', ?)
               ORDER BY deleted_at DESC""",
            (user_id, f"-{days} days"),
        ).fetchall()
    return [dict(r) for r in rows]


# ── Init on import ─────────────────────────────────────────────────────────────
init_db()
