"""
MailSage — Database
User state + Signal Profile storage per telegram_user_id.
"""

import json
import logging
from pathlib import Path

log      = logging.getLogger(__name__)
DATA_DIR = Path("/home/mailsage/mailsage/data")

DEFAULT_SIGNAL_PROFILE = {
    "priority_senders":  [],
    "alert_keywords":    [],
    "noise_filters":     [],
    "context_tags":      [],
    "brief_time":        "07:00",
    "timezone":          "Asia/Kolkata",
    "lookback_days":     1,
}

DEFAULT_USER = {
    "onboarded":      False,
    "tier":           "free",
    "api_calls_today": 0,
    "last_reset_date": "",
    "signal_profile": DEFAULT_SIGNAL_PROFILE,
}


def _user_path(user_id: str) -> Path:
    return DATA_DIR / f"{user_id}_user.json"


def _token_path(user_id: str) -> Path:
    return DATA_DIR / f"{user_id}_token.json"


def load_user(user_id: str) -> dict:
    path = _user_path(str(user_id))
    if not path.exists():
        return dict(DEFAULT_USER)
    try:
        return json.loads(path.read_text())
    except Exception as e:
        log.error(f"load_user failed for {user_id}: {e}")
        return dict(DEFAULT_USER)


def save_user(user_id: str, data: dict):
    path = _user_path(str(user_id))
    try:
        path.write_text(json.dumps(data, indent=2))
    except Exception as e:
        log.error(f"save_user failed for {user_id}: {e}")


def is_onboarded(user_id: str) -> bool:
    return load_user(user_id).get("onboarded", False)


def has_gmail_token(user_id: str) -> bool:
    return _token_path(str(user_id)).exists()


def get_signal_profile(user_id: str) -> dict:
    return load_user(user_id).get("signal_profile", DEFAULT_SIGNAL_PROFILE)


def update_signal_profile(user_id: str, updates: dict):
    data = load_user(user_id)
    profile = data.get("signal_profile", dict(DEFAULT_SIGNAL_PROFILE))
    profile.update(updates)
    data["signal_profile"] = profile
    save_user(user_id, data)
    log.info(f"Signal profile updated for {user_id}: {list(updates.keys())}")


def get_tier(user_id: str) -> str:
    return load_user(user_id).get("tier", "free")


def check_api_limit(user_id: str) -> bool:
    """Returns True if user can make an API call."""
    from datetime import date
    data   = load_user(user_id)
    today  = str(date.today())
    limit  = 3 if data.get("tier") == "free" else 30

    if data.get("last_reset_date") != today:
        data["api_calls_today"] = 0
        data["last_reset_date"] = today
        save_user(user_id, data)

    return data.get("api_calls_today", 0) < limit


def increment_api_calls(user_id: str):
    data = load_user(user_id)
    data["api_calls_today"] = data.get("api_calls_today", 0) + 1
    save_user(user_id, data)


def get_state(user_id: str) -> dict:
    data = load_user(user_id)
    return data.get("state", {})


def set_state(user_id: str, state: dict):
    data = load_user(user_id)
    data["state"] = state
    save_user(user_id, data)


def clear_state(user_id: str):
    data = load_user(user_id)
    data["state"] = {}
    save_user(user_id, data)
