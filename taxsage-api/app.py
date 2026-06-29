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


init_db()


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

    try:
        return jsonify(capital_gains.process(files, password))
    except ValueError as e:
        msg = str(e)
        if msg == "wrong_password":
            return jsonify({"error": "wrong_password",
                            "message": "Couldn't open this file — check PAN and DOB."}), 200
        if msg.startswith("claude_parse_failed"):
            return jsonify({"error": "parse_failed",
                            "message": "Could not extract capital gains data. Please try again."}), 200
        if msg.startswith("unsupported_file:"):
            return jsonify({"error": "unsupported_file",
                            "message": f"{msg.split(':',1)[1]} — only .xlsx and .pdf accepted."}), 200
        return jsonify({"error": "error", "message": msg}), 200
    except anthropic.APIError as e:
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

    try:
        return jsonify(form16.parse(pdf_bytes, password))
    except ValueError as e:
        msg = str(e)
        if msg == "wrong_password":
            return jsonify({"error": "wrong_password",
                            "message": "Could not open PDF — check PAN and date of birth."}), 200
        if msg.startswith("claude_parse_failed"):
            return jsonify({"error": "parse_failed",
                            "message": "Could not extract Form 16 data. Please try again."}), 200
        return jsonify({"error": "error", "message": msg}), 200
    except anthropic.APIError as e:
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

    result = ais_scanner.scan(pdf_bytes, password)
    return jsonify(result)


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

    total = len(rows)
    rows_html = "\n".join(
        f"<tr><td>{r[0]}</td><td>{r[1] or ''}</td><td>{r[2]}</td></tr>"
        for r in rows
    )
    html = f"""<!doctype html><html><head><meta charset=utf-8>
<title>TaxSage Leads</title>
<style>body{{font-family:monospace;padding:2rem;}}
table{{border-collapse:collapse;width:100%;}}
th,td{{border:1px solid #ccc;padding:6px 12px;text-align:left;}}
th{{background:#f4f4f4;}}</style></head><body>
<h2>TaxSage Leads ({total})</h2>
<table><tr><th>Email</th><th>Feature</th><th>Timestamp (UTC)</th></tr>
{rows_html}
</table></body></html>"""
    return make_response(html, 200)


if __name__ == "__main__":
    app.run(port=5003)
