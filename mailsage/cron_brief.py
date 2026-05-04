"""
MailSage — Auto Brief Cron
Runs at 7AM and 7PM IST, sends brief to all users who have Gmail connected.
"""

import os
import json
import logging
import requests
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv
import pytz

from database import has_gmail_token, get_signal_profile, check_api_limit, increment_api_calls
from gmail import fetch_emails
from claude_api import get_brief
from cache import get_cached_brief, set_cached_brief

load_dotenv()

# Prevent duplicate runs
import fcntl, sys
_lock = open("/tmp/mailsage_cron.lock", "w")
try:
    fcntl.flock(_lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
except IOError:
    logging.info("Cron already running — exiting.")
    sys.exit(0)

TELEGRAM_TOKEN = os.getenv("TELEGRAM_TOKEN")
BASE_URL       = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}"
DATA_DIR       = Path("/home/mailsage/mailsage/data")

logging.basicConfig(
    level    = logging.INFO,
    format   = "%(asctime)s %(levelname)s %(message)s",
    handlers = [
        logging.FileHandler("/home/mailsage/mailsage/logs/cron.log"),
        logging.StreamHandler()
    ]
)
log = logging.getLogger(__name__)


def send(chat_id, text, parse_mode="Markdown"):
    try:
        requests.post(f"{BASE_URL}/sendMessage", json={
            "chat_id":    chat_id,
            "text":       text,
            "parse_mode": parse_mode,
        }, timeout=10)
    except Exception as e:
        log.error(f"send() failed for {chat_id}: {e}")


def get_all_user_ids() -> list[str]:
    """Find all users who have a token (i.e. Gmail connected)."""
    return [
        p.stem.replace("_token", "")
        for p in DATA_DIR.glob("*_token.json")
    ]


def is_evening() -> bool:
    return datetime.now(pytz.timezone("Asia/Kolkata")).hour >= 12


def send_auto_brief(user_id: str):
    if not has_gmail_token(user_id):
        return

    if not check_api_limit(user_id):
        log.info(f"Skipping {user_id} — daily limit reached")
        return

    evening = is_evening()

    # Check cache — 60-min TTL prevents duplicate runs; morning/evening are 12h apart so always fresh
    cached = get_cached_brief(user_id, 1)
    if cached:
        log.info(f"Skipping {user_id} — cached brief exists")
        return

    try:
        profile  = get_signal_profile(user_id)
        emails   = fetch_emails(user_id, lookback_days=1)
        brief    = get_brief(emails, profile, "last 24 hours")
        increment_api_calls(user_id)
        set_cached_brief(user_id, 1, brief)

        greeting = "🌆 *Good evening! Your MailSage brief is ready:*" if evening else "🌅 *Good morning! Your MailSage brief is ready:*"
        send(user_id, f"{greeting}\n\n" + brief)
        log.info(f"Auto-brief sent to {user_id}")

    except Exception as e:
        log.error(f"Auto-brief failed for {user_id}: {e}")


def main():
    log.info("Cron brief starting...")
    user_ids = get_all_user_ids()
    log.info(f"Found {len(user_ids)} user(s) with Gmail connected")

    for user_id in user_ids:
        send_auto_brief(user_id)

    log.info("Cron brief complete.")


if __name__ == "__main__":
    main()
