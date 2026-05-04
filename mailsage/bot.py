"""
MailSage — Telegram Bot
Commands: /start, /auth, /brief, /settings, /help
"""

import os
import json
import time
import logging
from datetime import datetime
from pathlib import Path

import requests
import pytz
from dotenv import load_dotenv

from database import (load_user, save_user, has_gmail_token,
                      get_signal_profile, check_api_limit,
                      increment_api_calls, get_tier, update_signal_profile,
                      get_state, set_state, clear_state)
from gmail import fetch_emails
from claude_api import get_brief
from auth_server import get_auth_url
from cache import get_cached_brief, set_cached_brief, invalidate_cache
from keyboard import main_menu
from personas import PERSONAS, DEFAULT_SIGNAL

load_dotenv()

TELEGRAM_TOKEN = os.getenv("TELEGRAM_TOKEN")
BASE_URL       = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}"
IST            = pytz.timezone("Asia/Kolkata")
DATA_DIR       = Path("/home/mailsage/mailsage/data")

logging.basicConfig(
    level    = logging.INFO,
    format   = "%(asctime)s %(levelname)s %(message)s",
    handlers = [
        logging.FileHandler("/home/mailsage/mailsage/logs/bot.log"),
        logging.StreamHandler()
    ]
)
log = logging.getLogger(__name__)

feedback_log = logging.getLogger("feedback")
feedback_log.setLevel(logging.INFO)
feedback_log.addHandler(logging.FileHandler("/home/mailsage/mailsage/logs/feedback.log"))


# ── Telegram helpers ───────────────────────────────────────────

def send(chat_id, text, parse_mode="Markdown", show_menu=True):
    payload = {
        "chat_id":    chat_id,
        "text":       text,
        "parse_mode": parse_mode,
    }
    if show_menu:
        payload["reply_markup"] = main_menu()
    try:
        requests.post(f"{BASE_URL}/sendMessage", json=payload, timeout=10)
    except Exception as e:
        log.error(f"send() failed for {chat_id}: {e}")


def send_typing(chat_id):
    try:
        requests.post(f"{BASE_URL}/sendChatAction", json={
            "chat_id": chat_id,
            "action":  "typing"
        }, timeout=5)
    except:
        pass


def send_brief_with_feedback(chat_id, text):
    payload = {
        "chat_id":    chat_id,
        "text":       text,
        "parse_mode": "Markdown",
        "reply_markup": {
            "inline_keyboard": [[
                {"text": "👍 Useful",     "callback_data": "feedback_good"},
                {"text": "👎 Not useful", "callback_data": "feedback_bad"},
                {"text": "💬 Feedback",   "callback_data": "feedback_text"},
            ]]
        }
    }
    try:
        requests.post(f"{BASE_URL}/sendMessage", json=payload, timeout=10)
    except Exception as e:
        log.error(f"send_brief_with_feedback() failed for {chat_id}: {e}")


def answer_callback(callback_id, text=""):
    try:
        requests.post(f"{BASE_URL}/answerCallbackQuery", json={
            "callback_query_id": callback_id,
            "text": text,
        }, timeout=5)
    except:
        pass


# ── Persona helpers ────────────────────────────────────────────

def send_persona_picker(chat_id):
    payload = {
        "chat_id":    chat_id,
        "text":       "👤 *What best describes you?*\n\nI'll set up your Signal Profile to match. You can customise it anytime with /settings.",
        "parse_mode": "Markdown",
        "reply_markup": {
            "inline_keyboard": [
                [
                    {"text": "💼 Salaried",        "callback_data": "persona_salaried"},
                    {"text": "📈 Investor",         "callback_data": "persona_investor"},
                ],
                [
                    {"text": "🏢 Founder",          "callback_data": "persona_founder"},
                    {"text": "👨‍👩‍👧 Family Manager", "callback_data": "persona_family"},
                ],
                [
                    {"text": "⚙️ Custom (start blank)", "callback_data": "persona_custom"},
                ],
            ]
        }
    }
    try:
        requests.post(f"{BASE_URL}/sendMessage", json=payload, timeout=10)
    except Exception as e:
        log.error(f"send_persona_picker() failed for {chat_id}: {e}")


def apply_persona(user_id, persona_key):
    if persona_key == "custom":
        update_signal_profile(user_id, DEFAULT_SIGNAL)
        return None
    persona = PERSONAS[persona_key]
    update_signal_profile(user_id, persona["signal"])
    return persona


def handle_setup(chat_id, user_id):
    send_persona_picker(chat_id)


# ── Date parsing ───────────────────────────────────────────────

def parse_brief_arg(arg: str):
    if not arg or arg.strip().lower() == "refresh":
        return 1, "last 24 hours"

    arg = arg.strip().lower()

    if arg.isdigit():
        days = int(arg)
        if days < 1 or days > 30:
            return None, "Please use between 1 and 30 days."
        return days, f"last {days} days"

    def parse_date(s):
        months = {"jan":1,"feb":2,"mar":3,"apr":4,"may":5,"jun":6,
                  "jul":7,"aug":8,"sep":9,"oct":10,"nov":11,"dec":12}
        for m, n in months.items():
            if m in s:
                day = s.replace(m, "").strip()
                if day.isdigit():
                    now = datetime.now(IST)
                    return datetime(now.year, n, int(day), tzinfo=IST)
        return None

    parts = arg.split()

    if len(parts) == 1:
        d = parse_date(parts[0])
        if d:
            days = max(1, (datetime.now(IST) - d).days + 1)
            return days, f"since {parts[0]}"
        return None, "Format: /brief 7 or /brief 3may or /brief 3may 10may"

    if len(parts) == 2:
        d1 = parse_date(parts[0])
        d2 = parse_date(parts[1])
        if d1 and d2:
            days = max(1, (datetime.now(IST) - d1).days + 1)
            return days, f"{parts[0]} to {parts[1]}"
        return None, "Format: /brief 3may 10may"

    return None, "Format: /brief 7 or /brief 3may or /brief 3may 10may"


# ── Command handlers ───────────────────────────────────────────

def handle_start(chat_id, user_id, first_name):
    user = load_user(user_id)
    if not user.get("onboarded"):
        user["onboarded"] = True
        save_user(user_id, user)
    clear_state(user_id)
    send(chat_id, f"""👋 Welcome to *MailSage*, {first_name}!

I give you a daily AI brief of your Gmail — what needs action, what to know, what to skip.

*Getting started:*
1️⃣ /auth — Connect your Gmail
2️⃣ /brief — Get your first email brief
3️⃣ /settings — Customise your Signal Profile

Type /help or use the buttons below.""")


def handle_auth(chat_id, user_id):
    if has_gmail_token(user_id):
        send(chat_id, "✅ Your Gmail is already connected. Send /brief to get your brief.")
        return
    try:
        auth_url = get_auth_url(user_id)
        send(chat_id, f"""🔐 *Connect your Gmail*

Click the link below to authorise MailSage to read your emails:

[Connect Gmail]({auth_url})

MailSage only reads — never sends, deletes, or modifies.
Your emails never leave Anthropic's infrastructure and are never used to train models.""")
    except Exception as e:
        log.error(f"handle_auth failed for {user_id}: {e}")
        send(chat_id, "❌ Auth link generation failed. Try again in a moment.")


def handle_brief(chat_id, user_id, arg=""):
    if not has_gmail_token(user_id):
        send(chat_id, "⚠️ Gmail not connected yet. Send /auth first.")
        return

    parts         = arg.strip().lower().split()
    force_refresh = "refresh" in parts
    clean_arg     = " ".join(p for p in parts if p != "refresh")
    lookback_days, label = parse_brief_arg(clean_arg)
    if lookback_days is None:
        send(chat_id, f"⚠️ {label}")
        return

    if not force_refresh:
        cached = get_cached_brief(user_id, lookback_days)
        if cached:
            send_brief_with_feedback(chat_id, f"📋 _{label} (cached):_\n\n{cached}")
            return

    if not check_api_limit(user_id):
        tier = get_tier(user_id)
        if tier == "free":
            send(chat_id, "⚠️ You've used your 3 free briefs today. Upgrade to paid for 30/day.")
        else:
            send(chat_id, "⚠️ Daily limit reached. Resets at midnight IST.")
        return

    send_typing(chat_id)
    if force_refresh:
        send(chat_id, f"🔄 Refreshing brief for *{label}*...")
    else:
        send(chat_id, f"⏳ Fetching emails for *{label}*...")

    try:
        profile = get_signal_profile(user_id)
        emails  = fetch_emails(user_id, lookback_days=lookback_days)
        send_typing(chat_id)
        brief   = get_brief(emails, profile, label)
        increment_api_calls(user_id)
        set_cached_brief(user_id, lookback_days, brief)
        send_brief_with_feedback(chat_id, brief)

    except FileNotFoundError:
        send(chat_id, "⚠️ Gmail token missing. Please /auth again.")
    except Exception as e:
        log.error(f"handle_brief failed for {user_id}: {e}")
        send(chat_id, "❌ Something went wrong fetching your brief. Try again.")


def handle_settings(chat_id, user_id):
    profile = get_signal_profile(user_id)
    send(chat_id, f"""⚙️ *Your Signal Profile*

🟢 *Priority senders:*
{', '.join(profile['priority_senders']) if profile['priority_senders'] else 'None set'}

⚡ *Alert keywords:*
{', '.join(profile['alert_keywords']) if profile['alert_keywords'] else 'None set'}

🔇 *Noise filters:*
{', '.join(profile['noise_filters']) if profile['noise_filters'] else 'None set'}

⏰ *Brief time:* {profile.get('brief_time', '07:00')} IST

*To update:*
Use the commands below or just tell me what to add — e.g. "add my boss email to priority".""")


def handle_add_priority(chat_id, user_id, value):
    if not value:
        set_state(user_id, {"waiting_for": "priority"})
        send(chat_id, "✉️ Send me the email address to add as priority sender:")
        return
    profile = get_signal_profile(user_id)
    senders = profile.get("priority_senders", [])
    if value in senders:
        send(chat_id, f"✅ `{value}` is already in your priority senders.")
        return
    senders.append(value)
    update_signal_profile(user_id, {"priority_senders": senders})
    invalidate_cache(user_id)
    clear_state(user_id)
    send(chat_id, f"✅ Added `{value}` to priority senders.\nSignal Profile updated.")


def handle_add_keyword(chat_id, user_id, value):
    if not value:
        set_state(user_id, {"waiting_for": "keyword"})
        send(chat_id, "🔑 Send me the keyword to watch for in emails:")
        return
    profile  = get_signal_profile(user_id)
    keywords = profile.get("alert_keywords", [])
    if value in keywords:
        send(chat_id, f"✅ `{value}` is already in your alert keywords.")
        return
    keywords.append(value)
    update_signal_profile(user_id, {"alert_keywords": keywords})
    invalidate_cache(user_id)
    clear_state(user_id)
    send(chat_id, f"✅ Added `{value}` to alert keywords.\nSignal Profile updated.")


def handle_add_noise(chat_id, user_id, value):
    if not value:
        set_state(user_id, {"waiting_for": "noise"})
        send(chat_id, "🔇 Send me the email or domain to filter as noise:")
        return
    profile = get_signal_profile(user_id)
    noise   = profile.get("noise_filters", [])
    if value in noise:
        send(chat_id, f"✅ `{value}` is already in your noise filters.")
        return
    noise.append(value)
    update_signal_profile(user_id, {"noise_filters": noise})
    invalidate_cache(user_id)
    clear_state(user_id)
    send(chat_id, f"✅ Added `{value}` to noise filters.\nSignal Profile updated.")


def handle_set_time(chat_id, user_id, value):
    if not value:
        set_state(user_id, {"waiting_for": "time"})
        send(chat_id, "⏰ Send me your preferred brief time in HH:MM format (IST):\nExample: `07:30`")
        return
    try:
        datetime.strptime(value, "%H:%M")
    except ValueError:
        send(chat_id, "❌ Invalid format. Use HH:MM — e.g. `07:30`")
        return
    update_signal_profile(user_id, {"brief_time": value})
    clear_state(user_id)
    send(chat_id, f"✅ Brief time set to *{value} IST*.\nSignal Profile updated.")


def handle_help(chat_id):
    send(chat_id, """*MailSage Commands*

/brief — Last 24 hours
/brief 7 — Last 7 days
/brief 3may — Since 3rd May
/brief 3may 10may — Date range
/brief refresh — Force fresh brief
/auth — Connect or reconnect Gmail
/settings — View your Signal Profile
/add\\_priority — Add a priority sender
/add\\_keyword — Add an alert keyword
/add\\_noise — Add a noise filter
/set\\_time — Set auto-brief time
/help — Show this menu""")


# ── Feedback handlers ──────────────────────────────────────────

def handle_feedback_text(chat_id, user_id, text):
    path = DATA_DIR / f"{user_id}_feedback.json"
    entries = json.loads(path.read_text()) if path.exists() else []
    entries.append({"ts": datetime.now(IST).isoformat(), "text": text})
    path.write_text(json.dumps(entries, indent=2, ensure_ascii=False))
    clear_state(user_id)
    send(chat_id, "✅ Thanks — feedback saved. It helps make MailSage better.")
    feedback_log.info(f"{user_id} 💬 {text}")


def handle_callback_query(callback_query: dict):
    callback_id = callback_query["id"]
    user_id     = str(callback_query["from"]["id"])
    chat_id     = str(callback_query["message"]["chat"]["id"])
    data        = callback_query.get("data", "")

    if data == "feedback_good":
        answer_callback(callback_id, "Thanks! 👍")
        feedback_log.info(f"{user_id} 👍")
    elif data == "feedback_bad":
        answer_callback(callback_id, "Noted 👎")
        feedback_log.info(f"{user_id} 👎")
    elif data == "feedback_text":
        answer_callback(callback_id)
        set_state(user_id, {"waiting_for": "feedback"})
        send(chat_id, "💬 What would make it better?")
    elif data.startswith("persona_"):
        persona_key = data[len("persona_"):]
        answer_callback(callback_id)
        persona = apply_persona(user_id, persona_key)
        invalidate_cache(user_id)
        if persona is None:
            send(chat_id, "⚙️ *Custom profile set.* No filters applied yet.\n\nUse /settings to add your priority senders, keywords, and noise filters.\n\nSend /brief whenever you're ready.")
        else:
            top_keywords = ", ".join(persona["signal"]["alert_keywords"][:3])
            send(chat_id, f"✅ *Signal Profile set for {persona['emoji']} {persona['name']}.*\n\nYour brief will now prioritise {top_keywords}, and more.\n\nUse /settings to customise anytime. Send /brief to get started.")
        log.info(f"Persona set for {user_id}: {persona_key}")


# ── State handler ──────────────────────────────────────────────

def handle_waiting_state(chat_id, user_id, text, state):
    waiting_for = state.get("waiting_for")

    if waiting_for == "priority":
        handle_add_priority(chat_id, user_id, text)
    elif waiting_for == "keyword":
        handle_add_keyword(chat_id, user_id, text)
    elif waiting_for == "noise":
        handle_add_noise(chat_id, user_id, text)
    elif waiting_for == "time":
        handle_set_time(chat_id, user_id, text)
    elif waiting_for == "feedback":
        handle_feedback_text(chat_id, user_id, text)
    else:
        clear_state(user_id)
        send(chat_id, "I didn't understand that. Use the buttons below or send /help.")


# ── Message router ─────────────────────────────────────────────

def handle_update(update: dict):
    if update.get("callback_query"):
        handle_callback_query(update["callback_query"])
        return

    message = update.get("message")
    if not message:
        return

    chat_id    = str(message["chat"]["id"])
    user_id    = str(message["from"]["id"])
    first_name = message["from"].get("first_name", "there")
    text       = message.get("text", "").strip()

    if not text:
        return

    # Check if user is mid-conversation state
    state = get_state(user_id)
    if state and not text.startswith("/"):
        # Map keyboard buttons first
        button_map = {
            "📬 brief":    None,
            "🔄 refresh":  None,
            "⚙️ settings": None,
            "❓ help":     None,
        }
        if text.lower() not in button_map:
            handle_waiting_state(chat_id, user_id, text, state)
            return

    # Map keyboard buttons to commands
    button_map = {
        "📬 brief":    ("brief",    ""),
        "🔄 refresh":  ("brief",    "refresh"),
        "⚙️ settings": ("settings", ""),
        "❓ help":     ("help",     ""),
    }

    mapped = button_map.get(text.lower())
    if mapped:
        clear_state(user_id)
        cmd, arg = mapped
    else:
        cmd = text.split()[0].lower().lstrip("/")
        arg = text[len(text.split()[0]):].strip()

    if cmd == "start":
        handle_start(chat_id, user_id, first_name)
    elif cmd == "auth":
        handle_auth(chat_id, user_id)
    elif cmd == "setup":
        handle_setup(chat_id, user_id)
    elif cmd == "brief":
        handle_brief(chat_id, user_id, arg)
    elif cmd == "settings":
        handle_settings(chat_id, user_id)
    elif cmd == "add_priority":
        handle_add_priority(chat_id, user_id, arg)
    elif cmd == "add_keyword":
        handle_add_keyword(chat_id, user_id, arg)
    elif cmd == "add_noise":
        handle_add_noise(chat_id, user_id, arg)
    elif cmd == "set_time":
        handle_set_time(chat_id, user_id, arg)
    elif cmd == "help":
        handle_help(chat_id)
    else:
        send(chat_id, "I didn't understand that. Use the buttons below or send /help.")


# ── Polling loop ───────────────────────────────────────────────

def main():
    log.info("MailSage bot starting...")
    offset = 0

    while True:
        try:
            resp = requests.get(f"{BASE_URL}/getUpdates", params={
                "offset":  offset,
                "timeout": 30
            }, timeout=35)

            updates = resp.json().get("result", [])
            for update in updates:
                offset = update["update_id"] + 1
                try:
                    handle_update(update)
                except Exception as e:
                    log.error(f"handle_update error: {e}")

        except Exception as e:
            log.error(f"Polling error: {e}")
            time.sleep(5)


if __name__ == "__main__":
    main()
