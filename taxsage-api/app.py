import io
import os
import re
import sqlite3
from datetime import datetime, timezone
from flask import Flask, request, jsonify, make_response
from dotenv import load_dotenv
import anthropic
import ais_scanner
import capital_gains
import form16

load_dotenv()

app = Flask(__name__)

DB_PATH = "leads.db"
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
FAKE_DOMAINS = {"example.com", "test.com", "mailinator.com", "guerrillamail.com", "throwam.com"}
FAKE_LOCALS  = {"test", "admin", "user", "noreply", "fake"}


def init_db():
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS leads (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT NOT NULL,
                feature TEXT,
                created_at TEXT NOT NULL
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS scan_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tool TEXT NOT NULL,
                status TEXT NOT NULL,
                error_type TEXT,
                file_count INTEGER,
                created_at TEXT NOT NULL
            )
        """)
    try:
        with sqlite3.connect(DB_PATH) as conn:
            conn.execute("ALTER TABLE scan_logs ADD COLUMN email TEXT")
    except sqlite3.OperationalError:
        pass  # column already exists


init_db()


def log_scan(tool: str, status: str, error_type: str = None,
             file_count: int = 0, email: str = None):
    try:
        with sqlite3.connect(DB_PATH) as conn:
            conn.execute(
                "INSERT INTO scan_logs (tool, status, error_type, file_count, email, created_at) "
                "VALUES (?, ?, ?, ?, ?, ?)",
                (tool, status, error_type, file_count, email,
                 datetime.now(timezone.utc).isoformat())
            )
    except Exception:
        pass  # never let logging break the actual request


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


@app.route("/capture-lead", methods=["POST"])
def capture_lead():
    data = request.get_json(silent=True) or {}
    email = data.get("email", "").strip()
    feature = data.get("feature", "").strip()

    local, _, domain = email.partition("@")
    if (not email or not EMAIL_RE.match(email)
            or domain.lower() in FAKE_DOMAINS
            or local.lower() in FAKE_LOCALS):
        return jsonify({"error": "invalid_email",
                        "message": "Please enter a valid email address."}), 400

    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            "INSERT INTO leads (email, feature, created_at) VALUES (?, ?, ?)",
            (email, feature, datetime.now(timezone.utc).isoformat())
        )
    return jsonify({"ok": True}), 200


@app.route("/capital-gains-summary", methods=["POST"])
def capital_gains_summary():
    files_storage = request.files.getlist("files[]")
    pan = request.form.get("pan", "").strip()
    dob = request.form.get("dob", "").strip()

    if not files_storage:
        return jsonify({"error": "missing_files", "message": "Upload at least one file."}), 400

    password = pan.lower() + dob if pan and dob else ""
    files = [(f.filename, f.read()) for f in files_storage]
    file_count = len(files)
    email = request.form.get("user_email", "").strip() or None

    try:
        result = capital_gains.process(files, password)
        log_scan("capital-gains", "success", file_count=file_count, email=email)
        return jsonify(result)
    except ValueError as e:
        msg = str(e)
        if msg == "wrong_password":
            log_scan("capital-gains", "error", "wrong_password", file_count, email)
            return jsonify({"error": "wrong_password",
                            "message": "Couldn't open this file — check PAN and DOB."}), 200
        if msg.startswith("claude_parse_failed"):
            log_scan("capital-gains", "error", "parse_failed", file_count, email)
            return jsonify({"error": "parse_failed",
                            "message": "Could not extract capital gains data. Please try again."}), 200
        if msg.startswith("unsupported_file:"):
            log_scan("capital-gains", "error", "unsupported_file", file_count, email)
            return jsonify({"error": "unsupported_file",
                            "message": f"{msg.split(':',1)[1]} — only .xlsx and .pdf accepted."}), 200
        log_scan("capital-gains", "error", "unknown", file_count, email)
        return jsonify({"error": "error", "message": msg}), 200
    except anthropic.APIError as e:
        log_scan("capital-gains", "error", "api_error", file_count, email)
        return jsonify({"error": "api_error", "detail": str(e)}), 200


@app.route("/form16-summary", methods=["POST"])
def form16_summary():
    pdf_file = request.files.get("pdf_file")
    pan = request.form.get("pan", "").strip()
    dob = request.form.get("dob", "").strip()

    if not pdf_file:
        return jsonify({"error": "missing_file",
                        "message": "Upload your Form 16 PDF."}), 400

    password = pan.lower() + dob if pan and dob else ""
    pdf_bytes = pdf_file.read()
    email = request.form.get("user_email", "").strip() or None

    try:
        result = form16.parse(pdf_bytes, password)
        log_scan("form16", "success", file_count=1, email=email)
        return jsonify(result)
    except ValueError as e:
        msg = str(e)
        if msg == "wrong_password":
            log_scan("form16", "error", "wrong_password", 1, email)
            return jsonify({"error": "wrong_password",
                            "message": "Could not open PDF — check PAN and date of birth."}), 200
        if msg.startswith("claude_parse_failed"):
            log_scan("form16", "error", "parse_failed", 1, email)
            return jsonify({"error": "parse_failed",
                            "message": "Could not extract Form 16 data. Please try again."}), 200
        log_scan("form16", "error", "unknown", 1, email)
        return jsonify({"error": "error", "message": msg}), 200
    except anthropic.APIError as e:
        log_scan("form16", "error", "api_error", 1, email)
        return jsonify({"error": "api_error", "detail": str(e)}), 200


@app.route("/scan", methods=["POST"])
def scan():
    pdf_file = request.files.get("pdf_file")
    pan = request.form.get("pan", "").strip()
    dob = request.form.get("dob", "").strip()

    if not pdf_file or not pan or not dob:
        return jsonify({"error": "missing_fields", "message": "pdf_file, pan, and dob are required."}), 400

    password = pan.lower() + dob
    pdf_bytes = pdf_file.read()
    email = request.form.get("user_email", "").strip() or None

    try:
        result = ais_scanner.scan(pdf_bytes, password)
        log_scan("ais-scanner", "success", file_count=1, email=email)
        return jsonify(result)
    except ValueError as e:
        msg = str(e)
        if msg == "wrong_password":
            log_scan("ais-scanner", "error", "wrong_password", 1, email)
            return jsonify({"error": "wrong_password",
                            "message": "Couldn't open this file — check PAN and DOB."}), 200
        if msg.startswith("claude_parse_failed"):
            log_scan("ais-scanner", "error", "parse_failed", 1, email)
            return jsonify({"error": "parse_failed",
                            "message": "Could not extract AIS data. Please try again."}), 200
        log_scan("ais-scanner", "error", "unknown", 1, email)
        return jsonify({"error": "error", "message": msg}), 200
    except anthropic.APIError as e:
        log_scan("ais-scanner", "error", "api_error", 1, email)
        return jsonify({"error": "api_error", "detail": str(e)}), 200


@app.route("/admin/leads", methods=["GET"])
@app.route("/taxsage-api/admin/leads", methods=["GET"])
def admin_leads():
    token = request.args.get("token", "")
    if not token or token != os.environ.get("ADMIN_TOKEN", ""):
        return make_response("403 Forbidden", 403)

    with sqlite3.connect(DB_PATH) as conn:
        rows = conn.execute(
            "SELECT email, feature, created_at FROM leads ORDER BY id DESC"
        ).fetchall()
        rows_scans = conn.execute(
            "SELECT tool, status, error_type, file_count, email, created_at "
            "FROM scan_logs ORDER BY id DESC LIMIT 100"
        ).fetchall()

    total = len(rows)
    rows_html = "\n".join(
        f"<tr><td>{r[0]}</td><td>{r[1] or ''}</td><td>{r[2]}</td></tr>"
        for r in rows
    )

    total_scans = len(rows_scans)
    success_count = sum(1 for r in rows_scans if r[1] == "success")
    error_count = total_scans - success_count
    rows_scans_html = "\n".join(
        f'<tr style="color:{"green" if r[1] == "success" else "red"}">'
        f"<td>{r[0]}</td><td>{r[1]}</td><td>{r[2] or ''}</td>"
        f"<td>{r[3]}</td><td>{r[4] or ''}</td><td>{r[5]}</td></tr>"
        for r in rows_scans
    )

    html = f"""<!doctype html><html><head><meta charset=utf-8>
<title>TaxSage Leads</title>
<style>body{{font-family:monospace;padding:2rem;}}
table{{border-collapse:collapse;width:100%;margin-bottom:2rem;}}
th,td{{border:1px solid #ccc;padding:6px 12px;text-align:left;}}
th{{background:#f4f4f4;}}</style></head><body>
<h2>TaxSage Leads ({total})</h2>
<table><tr><th>Email</th><th>Feature</th><th>Timestamp (UTC)</th></tr>
{rows_html}
</table>
<h2>Scan Logs (last 100) — {success_count} success / {error_count} errors</h2>
<table><tr><th>Tool</th><th>Status</th><th>Error Type</th><th>Files</th><th>Email</th><th>Timestamp (UTC)</th></tr>
{rows_scans_html}
</table></body></html>"""
    return make_response(html, 200)


if __name__ == "__main__":
    app.run(port=5003)
