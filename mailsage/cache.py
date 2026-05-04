"""
MailSage — Brief Cache
Same user + same period within 60 mins = return cached, zero LLM cost.
"""

import json
import logging
from pathlib import Path
from datetime import datetime, timedelta

log      = logging.getLogger(__name__)
DATA_DIR = Path("/home/mailsage/mailsage/data")
TTL_MINS = 60


def _cache_path(user_id: str, lookback_days: int) -> Path:
    return DATA_DIR / f"{user_id}_cache_{lookback_days}d.json"


def get_cached_brief(user_id: str, lookback_days: int) -> str | None:
    path = _cache_path(str(user_id), lookback_days)
    if not path.exists():
        return None
    try:
        data = json.loads(path.read_text())
        cached_at = datetime.fromisoformat(data["cached_at"])
        if datetime.now() - cached_at < timedelta(minutes=TTL_MINS):
            log.info(f"Cache hit for user {user_id}, {lookback_days}d")
            return data["brief"]
        return None
    except Exception as e:
        log.warning(f"Cache read failed for {user_id}: {e}")
        return None


def set_cached_brief(user_id: str, lookback_days: int, brief: str):
    path = _cache_path(str(user_id), lookback_days)
    try:
        path.write_text(json.dumps({
            "cached_at": datetime.now().isoformat(),
            "brief":     brief,
        }, indent=2))
        log.info(f"Brief cached for user {user_id}, {lookback_days}d")
    except Exception as e:
        log.warning(f"Cache write failed for {user_id}: {e}")


def invalidate_cache(user_id: str):
    """Clear all cached briefs for a user — call after signal profile update."""
    for path in DATA_DIR.glob(f"{user_id}_cache_*.json"):
        path.unlink()
        log.info(f"Cache invalidated: {path.name}")
