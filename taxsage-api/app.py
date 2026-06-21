import io
import re
import sqlite3
from datetime import datetime, timezone
from flask import Flask, request, jsonify
from dotenv import load_dotenv
import ais_scanner

load_dotenv()

app = Flask(__name__)

DB_PATH = "leads.db"
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


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

    if not email or not EMAIL_RE.match(email):
        return jsonify({"ok": False, "message": "Please enter a valid email address."}), 200

    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            "INSERT INTO leads (email, feature, created_at) VALUES (?, ?, ?)",
            (email, feature, datetime.now(timezone.utc).isoformat())
        )
    return jsonify({"ok": True}), 200


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


if __name__ == "__main__":
    app.run(port=5003)
