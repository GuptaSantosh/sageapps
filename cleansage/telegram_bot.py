"""
CleanSage Telegram Companion Bot
---------------------------------
Companion only — the primary interface is the web app.
Runs in webhook mode via POST /telegram/webhook in app.py.
Sends messages by calling the Telegram Bot API directly over HTTP (no async loop).
"""

import os
import json
import requests

from database import get_user_by_telegram_id, get_tips, get_latest_scan
from database import update_user as _db_update_user

BOT_TOKEN  = os.getenv("TELEGRAM_BOT_TOKEN", "")
BASE_URL   = os.getenv("BASE_URL", "https://cleansage.sageapps.in")
API_BASE   = f"https://api.telegram.org/bot{BOT_TOKEN}"


# ---------------------------------------------------------------------------
# Outbound helpers
# ---------------------------------------------------------------------------

def _post(method: str, payload: dict) -> dict:
    try:
        r = requests.post(f"{API_BASE}/{method}", json=payload, timeout=10)
        return r.json()
    except requests.RequestException:
        return {}


def send_message(chat_id, text: str, reply_markup: dict | None = None) -> dict:
    payload = {
        "chat_id":    chat_id,
        "text":       text,
        "parse_mode": "Markdown",
    }
    if reply_markup:
        payload["reply_markup"] = reply_markup
    return _post("sendMessage", payload)


def answer_callback(callback_query_id: str, text: str = "") -> None:
    _post("answerCallbackQuery", {"callback_query_id": callback_query_id, "text": text})


def edit_message_text(chat_id, message_id: int, text: str) -> None:
    _post("editMessageText", {
        "chat_id":    chat_id,
        "message_id": message_id,
        "text":       text,
        "parse_mode": "Markdown",
    })


# ---------------------------------------------------------------------------
# Command handlers
# ---------------------------------------------------------------------------

def handle_start(chat_id, _user_data: dict) -> None:
    send_message(
        chat_id,
        "👋 *CleanSage* works in your browser.\n\n"
        "Connect Gmail, see your storage breakdown, and clean up in minutes.",
        reply_markup={
            "inline_keyboard": [[
                {"text": "Open CleanSage →", "url": BASE_URL}
            ]]
        },
    )


def handle_status(chat_id, _user_data: dict) -> None:
    user = get_user_by_telegram_id(str(chat_id))
    if not user:
        send_message(
            chat_id,
            "🔗 Link your account first by visiting the web app.",
            reply_markup={"inline_keyboard": [[
                {"text": "Open CleanSage →", "url": BASE_URL}
            ]]},
        )
        return

    latest = get_latest_scan(user["user_id"])
    if not latest:
        send_message(
            chat_id,
            "No scan yet. Run a scan from the dashboard first.",
            reply_markup={"inline_keyboard": [[
                {"text": "Go to dashboard →", "url": f"{BASE_URL}/dashboard"}
            ]]},
        )
        return

    used  = latest.get("total_gb", 0)
    total = 15.0  # default free tier; real value in breakdown
    breakdown = latest.get("breakdown", {})
    quota = breakdown.get("quota", {})
    if quota:
        used  = quota.get("used_gb", used)
        total = quota.get("total_gb", total)
        pct   = quota.get("percent_used", 0)
    else:
        pct = round(used / total * 100, 1) if total else 0

    last_cleaned = user.get("persona", "unknown")
    send_message(
        chat_id,
        f"📊 *{used} / {total} GB used ({pct}%)*\n"
        f"Persona: {last_cleaned.replace('_', ' ').title() if last_cleaned else 'unknown'}\n"
        f"Last scanned: {latest['scanned_at'][:10]}",
        reply_markup={"inline_keyboard": [[
            {"text": "Open dashboard →", "url": f"{BASE_URL}/dashboard"}
        ]]},
    )


def handle_tips(chat_id, _user_data: dict) -> None:
    user = get_user_by_telegram_id(str(chat_id))
    if not user:
        send_message(
            chat_id,
            "🔗 Link your account first by visiting the web app.",
            reply_markup={"inline_keyboard": [[
                {"text": "Open CleanSage →", "url": BASE_URL}
            ]]},
        )
        return

    tips = get_tips(user["user_id"], status="active")
    if not tips:
        send_message(chat_id, "✅ No pending tips — you're all caught up!")
        return

    for t in tips[:2]:
        tip = t.get("tip", {})
        tip_db_id = t.get("id")
        text = (
            f"💡 *{tip.get('title', 'Tip')}*\n\n"
            f"{tip.get('body', '')}\n\n"
            f"⏱ {tip.get('effort', '')}  ·  💾 {tip.get('savings_estimate', '')}\n\n"
            f"*How to:* {tip.get('how_to', '')}"
        )
        send_message(
            chat_id,
            text,
            reply_markup={
                "inline_keyboard": [[
                    {"text": "✅ Done",   "callback_data": f"tip_done:{tip_db_id}"},
                    {"text": "💤 Snooze", "callback_data": f"tip_snooze:{tip_db_id}"},
                ]]
            },
        )


# ---------------------------------------------------------------------------
# Callback query handler (inline button presses)
# ---------------------------------------------------------------------------

def handle_callback_query(callback_query: dict) -> None:
    query_id  = callback_query["id"]
    chat_id   = callback_query["from"]["id"]
    msg_id    = callback_query.get("message", {}).get("message_id")
    data      = callback_query.get("data", "")

    user = get_user_by_telegram_id(str(chat_id))
    if not user:
        answer_callback(query_id, "Account not linked.")
        return

    if data.startswith("tip_done:") or data.startswith("tip_snooze:"):
        action, tip_id_str = data.split(":", 1)
        try:
            tip_id = int(tip_id_str)
        except ValueError:
            answer_callback(query_id, "Invalid tip ID.")
            return

        new_status = "done" if action == "tip_done" else "snoozed"
        _update_tip_status(user["user_id"], tip_id, new_status)

        label = "marked as done ✅" if new_status == "done" else "snoozed 💤"
        answer_callback(query_id, f"Tip {label}")
        if msg_id:
            edit_message_text(chat_id, msg_id, f"_(Tip {label})_")
    else:
        answer_callback(query_id)


def _update_tip_status(user_id: str, tip_id: int, status: str) -> None:
    from datetime import datetime
    import sqlite3, os
    db_path = os.path.join(os.path.dirname(__file__), "data", "cleansage.db")
    now = datetime.utcnow().isoformat()
    with sqlite3.connect(db_path) as conn:
        conn.execute(
            "UPDATE tips SET status = ?, updated_at = ? WHERE id = ? AND user_id = ?",
            (status, now, tip_id, user_id),
        )


# ---------------------------------------------------------------------------
# Main dispatcher — called by Flask webhook route
# ---------------------------------------------------------------------------

def dispatch(update: dict) -> None:
    """Entry point from POST /telegram/webhook."""

    if "callback_query" in update:
        handle_callback_query(update["callback_query"])
        return

    message = update.get("message", {})
    if not message:
        return

    chat_id = message.get("chat", {}).get("id")
    text    = message.get("text", "").strip()

    if not chat_id or not text:
        return

    if text.startswith("/start"):
        handle_start(chat_id, message)
    elif text.startswith("/status"):
        handle_status(chat_id, message)
    elif text.startswith("/tips"):
        handle_tips(chat_id, message)
    # All other messages: silent (companion bot, not a chatbot)


# ---------------------------------------------------------------------------
# Webhook registration helper (run once after deploy)
# ---------------------------------------------------------------------------

def register_webhook(webhook_url: str) -> dict:
    """Call once after deploy: register_webhook('https://cleansage.sageapps.in/telegram/webhook')"""
    return _post("setWebhook", {"url": webhook_url})
