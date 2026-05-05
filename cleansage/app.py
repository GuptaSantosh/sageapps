import os
from datetime import datetime, timezone
from flask import Flask, redirect, request, session, render_template, jsonify, url_for
from dotenv import load_dotenv

load_dotenv()

from auth import get_auth_url, handle_callback, get_credentials
from signal import load_profile, save_profile, update_field
from database import get_user, create_user, update_user, get_tips, get_latest_scan
from tips import generate_tips, _detect_persona
from gmail import run_full_scan, empty_trash, empty_spam
from cache import get_cached_scan, invalidate_cache

app = Flask(__name__)
app.secret_key = os.getenv("FLASK_SECRET_KEY", "dev-secret-change-me")


def _time_ago(iso_str: str) -> str:
    """Convert UTC ISO timestamp to human 'X minutes ago' string."""
    try:
        dt = datetime.fromisoformat(iso_str).replace(tzinfo=timezone.utc)
        diff = int((datetime.now(timezone.utc) - dt).total_seconds())
        if diff < 60:
            return "just now"
        if diff < 3600:
            return f"{diff // 60} minute{'s' if diff // 60 != 1 else ''} ago"
        if diff < 86400:
            return f"{diff // 3600} hour{'s' if diff // 3600 != 1 else ''} ago"
        return f"{diff // 86400} day{'s' if diff // 86400 != 1 else ''} ago"
    except Exception:
        return "unknown"


@app.template_filter("commify")
def commify(n):
    try:
        return f"{int(n):,}"
    except (ValueError, TypeError):
        return n


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/auth/login")
def auth_login():
    user_id = session.get("user_id")
    if not user_id:
        # Generate a temporary session-based user ID for anonymous visitors
        import uuid
        user_id = str(uuid.uuid4())
        session["user_id"] = user_id

    auth_url = get_auth_url(user_id)
    return redirect(auth_url)


@app.route("/auth/callback")
def auth_callback():
    code = request.args.get("code")
    state = request.args.get("state")  # user_id

    if not code or not state:
        return redirect(url_for("index"))

    user_id = handle_callback(code, state)
    session["user_id"] = user_id
    session["authenticated"] = True

    # Ensure user row exists in DB (email resolved later on first scan)
    if not get_user(user_id):
        create_user(user_id, email="")

    # Skip onboarding if already done
    user = get_user(user_id)
    if user and user.get("onboarding_done"):
        return redirect(url_for("dashboard"))

    return redirect(url_for("onboard"))


@app.route("/onboard")
def onboard():
    if not session.get("authenticated"):
        return redirect(url_for("index"))
    return render_template("onboard.html")


@app.route("/onboard/complete", methods=["POST"])
def onboard_complete():
    if not session.get("authenticated"):
        return redirect(url_for("index"))

    user_id = session["user_id"]

    answers = {
        "whatsapp_backup":    request.form.get("whatsapp_backup"),
        "photos_quality":     request.form.get("photos_quality"),
        "whatsapp_autosave":  request.form.get("whatsapp_autosave"),
        "daily_email_volume": request.form.get("daily_email_volume"),
        "last_cleaned":       request.form.get("last_cleaned"),
        "primary_pain":       request.form.get("primary_pain"),
    }

    # Map answers → signal profile fields
    profile = load_profile(user_id)

    wa_backup = answers.get("whatsapp_backup")
    profile["whatsapp_backup_on_drive"] = (
        True if wa_backup == "yes" else
        False if wa_backup == "no" else None
    )

    photos_q = answers.get("photos_quality")
    profile["photos_original_quality"] = (
        True if photos_q == "original" else
        False if photos_q == "storage_saver" else None
    )

    vol_map = {"under_20": 10, "20_100": 60, "100_plus": 150}
    profile["daily_email_volume"] = vol_map.get(answers.get("daily_email_volume"))

    profile["last_cleaned"] = answers.get("last_cleaned")
    profile["primary_pain"] = answers.get("primary_pain")

    persona = _detect_persona(answers)
    profile["persona"] = persona

    save_profile(user_id, profile)
    update_user(user_id, persona=persona, onboarding_done=1)

    # Generate and persist tips
    generate_tips(user_id, answers)

    return redirect(url_for("dashboard"))


@app.route("/dashboard")
def dashboard():
    if not session.get("authenticated"):
        return redirect(url_for("auth_login"))

    user_id = session["user_id"]
    user = get_user(user_id)
    if not user or not user.get("onboarding_done"):
        return redirect(url_for("onboard"))

    creds = get_credentials(user_id)
    if not creds:
        return redirect(url_for("auth_login"))

    # Use cache if fresh, else run full scan
    scan = get_cached_scan(user_id)
    if not scan:
        scan = run_full_scan(user_id, creds)

    # Last scanned time
    latest = get_latest_scan(user_id)
    scanned_ago = _time_ago(latest["scanned_at"]) if latest else "never"

    # Pending tips (top 2 active)
    tips = get_tips(user_id, status="active")

    return render_template(
        "dashboard.html",
        scan=scan,
        scanned_ago=scanned_ago,
        tips=tips,
    )


@app.route("/action/empty-trash", methods=["POST"])
def action_empty_trash():
    if not session.get("authenticated"):
        return jsonify({"success": False, "error": "not authenticated"}), 401

    data = request.get_json(silent=True) or {}
    if not data.get("confirm"):
        return jsonify({"success": False, "error": "confirm required"}), 400

    user_id = session["user_id"]
    creds = get_credentials(user_id)
    if not creds:
        return jsonify({"success": False, "error": "credentials expired"}), 401

    result = empty_trash(user_id, creds)
    return jsonify(result)


@app.route("/action/empty-spam", methods=["POST"])
def action_empty_spam():
    if not session.get("authenticated"):
        return jsonify({"success": False, "error": "not authenticated"}), 401

    data = request.get_json(silent=True) or {}
    if not data.get("confirm"):
        return jsonify({"success": False, "error": "confirm required"}), 400

    user_id = session["user_id"]
    creds = get_credentials(user_id)
    if not creds:
        return jsonify({"success": False, "error": "credentials expired"}), 401

    result = empty_spam(user_id, creds)
    return jsonify(result)


@app.route("/action/rescan", methods=["POST"])
def action_rescan():
    if not session.get("authenticated"):
        return redirect(url_for("auth_login"))

    user_id = session["user_id"]
    creds = get_credentials(user_id)
    if not creds:
        return redirect(url_for("auth_login"))

    invalidate_cache(user_id)
    run_full_scan(user_id, creds)
    return redirect(url_for("dashboard"))


@app.route("/health")
def health():
    return jsonify({"status": "ok"})


if __name__ == "__main__":
    app.run(debug=False, host="0.0.0.0", port=5002)
