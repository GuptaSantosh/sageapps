"""
CleanSage weekly background scan
---------------------------------
Cron: 0 2 * * 0 (Sunday 2AM UTC = 7:30AM IST)
/etc/cron.d/cleansage

For each user with onboarding_done=1:
  - Run full scan
  - Compare with previous scan
  - If storage grew >500MB, send Telegram alert
"""

import os
import sys
import logging

# Ensure app directory is on path when run directly
sys.path.insert(0, os.path.dirname(__file__))

from dotenv import load_dotenv
load_dotenv()

from database import get_all_active_users, get_latest_scan
from auth import get_credentials
from gmail import run_full_scan
from telegram_bot import send_message

LOG_DIR = os.path.join(os.path.dirname(__file__), "logs")
os.makedirs(LOG_DIR, exist_ok=True)

logging.basicConfig(
    filename=os.path.join(LOG_DIR, "cron.log"),
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
)
log = logging.getLogger(__name__)

BASE_URL = os.getenv("BASE_URL", "https://cleansage.sageapps.in")
GROWTH_THRESHOLD_GB = 0.5  # alert if storage grew by more than 500MB


def _top_new_senders(old_breakdown: dict, new_breakdown: dict) -> list[str]:
    """Return senders that appeared or grew significantly between scans."""
    old_senders = {
        s["sender"]: s["estimated_size_mb"]
        for s in old_breakdown.get("bulk_senders", [])
    }
    new_senders = {
        s["sender"]: s["estimated_size_mb"]
        for s in new_breakdown.get("bulk_senders", [])
    }
    growth = []
    for sender, size_mb in new_senders.items():
        old_size = old_senders.get(sender, 0)
        delta = size_mb - old_size
        if delta > 50:  # grew by >50MB
            growth.append((sender, delta))
    growth.sort(key=lambda x: x[1], reverse=True)
    return [f"{s} (+{round(d)}MB)" for s, d in growth[:3]]


def scan_user(user: dict) -> None:
    user_id = user["user_id"]
    log.info(f"Scanning user {user_id}")

    creds = get_credentials(user_id)
    if not creds:
        log.warning(f"No valid credentials for {user_id} — skipping")
        return

    # Snapshot previous scan before running new one
    previous = get_latest_scan(user_id)
    prev_total_gb = previous["total_gb"] if previous else 0.0
    prev_breakdown = previous.get("breakdown", {}) if previous else {}

    try:
        new_breakdown = run_full_scan(user_id, creds)
    except Exception as e:
        log.error(f"Scan failed for {user_id}: {e}")
        return

    new_quota = new_breakdown.get("quota", {})
    new_total_gb = new_quota.get("used_gb", 0.0)
    delta_gb = round(new_total_gb - prev_total_gb, 2)

    log.info(f"User {user_id}: prev={prev_total_gb}GB new={new_total_gb}GB delta={delta_gb}GB")

    # Alert only if linked to Telegram and storage grew significantly
    telegram_chat_id = user.get("telegram_chat_id")
    if not telegram_chat_id:
        return

    if delta_gb < GROWTH_THRESHOLD_GB:
        return

    new_senders = _top_new_senders(prev_breakdown, new_breakdown)
    sender_line = ""
    if new_senders:
        sender_line = f"\nNew heavy senders: {', '.join(new_senders)}"

    pct = new_quota.get("percent_used", 0)
    total_gb = new_quota.get("total_gb", 15.0)

    alert_text = (
        f"⚠️ *Your storage grew by {delta_gb} GB this week.*\n"
        f"Now at {new_total_gb} / {total_gb} GB ({pct}% used).{sender_line}\n\n"
        f"Review and clean up now 👇"
    )
    send_message(
        telegram_chat_id,
        alert_text,
        reply_markup={"inline_keyboard": [[
            {"text": "Review now →", "url": f"{BASE_URL}/dashboard"}
        ]]},
    )
    log.info(f"Alert sent to {telegram_chat_id} for user {user_id}")


def main():
    log.info("=== CleanSage weekly cron scan started ===")
    users = get_all_active_users()
    log.info(f"Found {len(users)} active users")
    for user in users:
        try:
            scan_user(user)
        except Exception as e:
            log.error(f"Unhandled error for user {user.get('user_id')}: {e}")
    log.info("=== Cron scan complete ===")


if __name__ == "__main__":
    main()
