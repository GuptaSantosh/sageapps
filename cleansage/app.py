from gevent import monkey
monkey.patch_all()
import os
from datetime import datetime, timezone
from flask import Flask, redirect, request, session, render_template, jsonify, url_for
from dotenv import load_dotenv

load_dotenv()

from auth import get_auth_url, handle_callback, get_credentials
from signal_profile import load_profile, save_profile, update_field
from database import get_user, create_user, update_user, get_tips, get_latest_scan, get_deleted_items, link_telegram
from tips import generate_tips, _detect_persona
from gmail import run_full_scan, empty_trash, empty_spam, move_to_trash_bulk, fetch_messages_for_preview
from cache import get_cached_scan, cache_scan, invalidate_cache, patch_cache_after_delete

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

    # Render immediately — scan data loaded async via /api/scan
    tips = get_tips(user_id, status="active")
    return render_template("dashboard.html", tips=tips)


@app.route("/api/scan")
def api_scan():
    if not session.get("authenticated"):
        return jsonify({"error": "not authenticated"}), 401

    user_id = session["user_id"]
    creds, err = _require_creds(user_id)
    if err:
        return err

    force = request.args.get("force") == "true"
    if force:
        invalidate_cache(user_id)

    scan = get_cached_scan(user_id)
    if not scan:
        scan = run_full_scan(user_id, creds)
        cache_scan(user_id, scan)

    latest = get_latest_scan(user_id)
    scanned_ago = _time_ago(latest["scanned_at"]) if latest else "never"

    return jsonify({"scan": scan, "scanned_ago": scanned_ago})


@app.route("/api/bulk-senders")
def api_bulk_senders():
    if not session.get("authenticated"):
        return jsonify({"error": "not authenticated"}), 401

    user_id = session["user_id"]
    creds, err = _require_creds(user_id)
    if err:
        return err

    cache_key = f"{user_id}_bulk_senders"
    force = request.args.get("force") == "true"
    if not force:
        cached = get_cached_scan(cache_key)
        if cached:
            return jsonify({"bulk_senders": cached, "from_cache": True})

    from gmail import get_bulk_senders
    senders = get_bulk_senders(creds)
    result = {"bulk_senders": senders}
    if result:  # never cache empty result
        cache_scan(cache_key, result, ttl=3600)

    return jsonify(result)


@app.route("/api/tier-sizes")
def api_tier_sizes():
    if not session.get("authenticated"):
        return jsonify({"error": "not authenticated"}), 401

    user_id = session["user_id"]
    creds, err = _require_creds(user_id)
    if err:
        return err

    # Check 24h cache
    cache_key = f"{user_id}_tier_sizes"
    force = request.args.get("force") == "true"
    if not force:
        cached = get_cached_scan(cache_key)
        if cached:
            return jsonify({"tier_sizes": cached, "from_cache": True})

    # Need cleanup_tiers from last scan to get queries
    latest_scan = get_latest_scan(user_id)
    if not latest_scan:
        return jsonify({"error": "no scan found"}), 404

    import json
    breakdown = latest_scan.get("breakdown", {})
    if isinstance(breakdown, str):
        breakdown = json.loads(breakdown)
    cleanup_tiers = breakdown.get("cleanup_tiers", {})
    if not cleanup_tiers:
        return jsonify({"error": "no cleanup tiers in scan"}), 404

    from gmail import get_tier_sizes
    try:
        result = get_tier_sizes(creds, cleanup_tiers)
    except Exception as e:
        return jsonify({"error": str(e), "tier_sizes": {}}), 500

    if result:
        cache_scan(cache_key, result, ttl=86400)  # 24h cache

    return jsonify({"tier_sizes": result, "from_cache": False})


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
    # Kept for backwards compatibility; dashboard now uses /api/scan?force=true
    if not session.get("authenticated"):
        return redirect(url_for("auth_login"))
    return redirect(url_for("dashboard"))


@app.route("/action/preview-bulk", methods=["GET", "POST"])
def action_preview_bulk():
    if not session.get("authenticated"):
        return redirect(url_for("auth_login"))

    user_id = session["user_id"]
    creds, err = _require_creds(user_id)
    if err:
        return err

    # Support both GET (query params) and POST (JSON body)
    if request.method == "GET":
        data = {}
        category = request.args.get("category", "")
        sender   = request.args.get("sender")
    else:
        data = request.get_json(silent=True) or {}
        category = data.get("category", "")
        sender   = data.get("sender")  # optional, used for bulk_sender

    VALID_CATEGORIES = {"large_attachments", "bulk_sender",
                        "old_promotions", "query"}
    if category not in VALID_CATEGORIES:
        return jsonify({"success": False, "error": "invalid category"}), 400

    # For query-based categories, q param is the raw Gmail query
    if category == "query":
        raw_query = request.args.get("q") or data.get("q", "")
        if not raw_query:
            return jsonify({"success": False, "error": "q required"}), 400
        items = fetch_messages_for_preview(
            creds, category, sender=raw_query, max_results=50
        )
    else:
        items = fetch_messages_for_preview(
            creds, category, sender=sender, max_results=50
        )

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
        "query":             data.get("label") or request.args.get("label") or "Emails",
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

    import threading

    # Patch cache immediately so dashboard is instant
    patch_cache_after_delete(user_id, message_ids)

    # Run actual trash in background — don't block the response
    def do_trash():
        move_to_trash_bulk(user_id, creds, message_items)

    threading.Thread(target=do_trash, daemon=True).start()

    return jsonify({"success": True, "success_count": len(message_ids), "failed_count": 0})


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



@app.route("/review/large-attachments")
def review_large_attachments():
    if not session.get("authenticated"):
        return redirect(url_for("auth_login"))

    user_id = session["user_id"]
    creds, err = _require_creds(user_id)
    if err:
        return err

    from gmail import get_large_attachments
    # Use cached full list if available, else fetch and cache
    cache_key = f"{user_id}_large_attachments_full"
    cached_full = get_cached_scan(cache_key)
    if cached_full:
        items = cached_full.get("items", [])
    else:
        items = get_large_attachments(creds, min_size_mb=5, max_results=50)
        cache_scan(cache_key, {"items": items}, ttl=3600)

    # Normalise keys to match preview.html expectations
    normalised = []
    for it in items:
        normalised.append({
            "message_id": it.get("id", ""),
            "subject":    it.get("subject", "(no subject)"),
            "sender":     it.get("from", ""),
            "date":       it.get("date", ""),
            "size_mb":    it.get("size_mb", 0),
            "attachment_names": [],
        })

    page      = int(request.args.get("page", 1))
    per_page  = 25
    total     = len(normalised)
    total_pages = max(1, -(-total // per_page))  # ceiling div
    start     = (page - 1) * per_page
    page_items = normalised[start:start + per_page]
    total_size_gb = round(sum(i["size_mb"] for i in normalised) / 1024, 2)

    return render_template(
        "preview.html",
        title="Large Attachments",
        items=page_items,
        total_count=total,
        selected_count=len(page_items),
        total_size_gb=total_size_gb,
        total_pages=total_pages,
        page=page,
        action_type="large_attachments",
        delete_mode="trash",
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
