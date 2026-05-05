import os
from datetime import datetime, timezone
from flask import Flask, redirect, request, session, render_template, jsonify, url_for
from dotenv import load_dotenv

load_dotenv()

from auth import get_auth_url, handle_callback, get_credentials
from signal import load_profile, save_profile, update_field
from database import get_user, create_user, update_user, get_tips, get_latest_scan, get_deleted_items, link_telegram
from tips import generate_tips, _detect_persona
from gmail import run_full_scan, empty_trash, empty_spam, move_to_trash_bulk, fetch_messages_for_preview
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


def _require_creds(user_id: str):
    """
    Returns (credentials, None) if valid, or (None, error_json_response).
    All action routes call this before executing.
    """
    creds = get_credentials(user_id)
    if not creds:
        return None, (
            jsonify({
                "success": False,
                "error": "credentials_expired",
                "redirect": url_for("auth_login"),
            }),
            401,
        )
    return creds, None


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
    creds, err = _require_creds(user_id)
    if err:
        return redirect(url_for("auth_login"))

    invalidate_cache(user_id)
    run_full_scan(user_id, creds)
    return redirect(url_for("dashboard"))


@app.route("/action/preview-bulk", methods=["POST"])
def action_preview_bulk():
    if not session.get("authenticated"):
        return redirect(url_for("auth_login"))

    user_id = session["user_id"]
    creds, err = _require_creds(user_id)
    if err:
        return err

    data = request.get_json(silent=True) or {}
    category = data.get("category", "")
    sender   = data.get("sender")  # optional, used for bulk_sender

    VALID_CATEGORIES = {"large_attachments", "bulk_sender", "old_promotions"}
    if category not in VALID_CATEGORIES:
        return jsonify({"success": False, "error": "invalid category"}), 400

    items = fetch_messages_for_preview(creds, category, sender=sender)

    PAGE_SIZE = 20
    page = max(1, int(request.args.get("page", 1)))
    total = len(items)
    total_pages = max(1, (total + PAGE_SIZE - 1) // PAGE_SIZE)
    page = min(page, total_pages)
    paged_items = items[(page - 1) * PAGE_SIZE : page * PAGE_SIZE]

    total_size_gb = round(sum(i["size_mb"] for i in items) / 1024, 2)

    CATEGORY_TITLES = {
        "large_attachments": "Large attachments",
        "bulk_sender":       f"Mail from {sender}" if sender else "Bulk sender mail",
        "old_promotions":    "Old promotional emails (90+ days)",
    }

    return render_template(
        "preview.html",
        title=CATEGORY_TITLES[category],
        items=paged_items,
        total_count=total,
        selected_count=len(paged_items),
        total_size_gb=total_size_gb,
        total_pages=total_pages,
        page=page,
        action_type=category,
        delete_mode="trash",
        all_ids=[i["message_id"] for i in items],
    )


@app.route("/action/execute", methods=["POST"])
def action_execute():
    if not session.get("authenticated"):
        return jsonify({"success": False, "error": "not authenticated"}), 401

    user_id = session["user_id"]
    creds, err = _require_creds(user_id)
    if err:
        return err

    data = request.get_json(silent=True) or {}

    if not data.get("confirm"):
        return jsonify({"success": False, "error": "confirm required"}), 400

    message_ids = data.get("message_ids", [])
    if not message_ids or not isinstance(message_ids, list):
        return jsonify({"success": False, "error": "message_ids required"}), 400

    action = data.get("action", "trash")
    if action != "trash":
        return jsonify({"success": False, "error": "only trash action supported"}), 400

    # message_items: we only have IDs here; pass minimal metadata so gmail.py
    # can log what it has — caller may optionally send richer items
    message_items = data.get("message_items") or [
        {"message_id": mid, "sender": "", "subject": "", "size_mb": 0.0}
        for mid in message_ids
    ]

    result = move_to_trash_bulk(user_id, creds, message_items)
    result["success"] = result["failed_count"] == 0 or result["success_count"] > 0
    return jsonify(result)


@app.route("/action/history")
def action_history():
    if not session.get("authenticated"):
        return redirect(url_for("auth_login"))

    user_id = session["user_id"]
    items = get_deleted_items(user_id, days=30)

    total_freed_mb = round(sum(i.get("size_mb", 0) for i in items), 2)

    return render_template(
        "history.html",
        items=items,
        total_freed_mb=total_freed_mb,
    )


@app.route("/telegram/webhook", methods=["POST"])
def telegram_webhook():
    # Import here to avoid circular import at module load
    from telegram_bot import dispatch
    import hmac, hashlib

    # Validate the request is from Telegram (token in URL as secret)
    expected = os.getenv("TELEGRAM_BOT_TOKEN", "")
    token_header = request.headers.get("X-Telegram-Bot-Api-Secret-Token", "")
    webhook_secret = os.getenv("TELEGRAM_WEBHOOK_SECRET", "")
    if webhook_secret and token_header != webhook_secret:
        return "", 403

    update = request.get_json(silent=True)
    if update:
        try:
            dispatch(update)
        except Exception:
            pass  # never return 500 to Telegram — it will retry
    return "", 200


@app.route("/auth/link-telegram")
def auth_link_telegram():
    """
    Called from the dashboard with ?tg_id=<chat_id> to link a Telegram account.
    The user copies a link from the bot or scans a QR code.
    """
    if not session.get("authenticated"):
        return redirect(url_for("auth_login"))

    tg_id = request.args.get("tg_id", "").strip()
    if tg_id and tg_id.isdigit():
        link_telegram(session["user_id"], tg_id)
    return redirect(url_for("dashboard"))


@app.route("/health")
def health():
    return jsonify({"status": "ok"})


if __name__ == "__main__":
    app.run(debug=False, host="0.0.0.0", port=5002)
