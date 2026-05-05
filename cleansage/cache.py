import os
import json
import time

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
os.makedirs(DATA_DIR, exist_ok=True)


def _cache_path(user_id: str) -> str:
    return os.path.join(DATA_DIR, f"{user_id}_scan_cache.json")


def cache_scan(user_id: str, data: dict, ttl: int = 3600) -> None:
    payload = {
        "expires_at": time.time() + ttl,
        "data": data,
    }
    path = _cache_path(user_id)
    tmp = path + ".tmp"
    with open(tmp, "w") as f:
        json.dump(payload, f)
    os.replace(tmp, path)


def get_cached_scan(user_id: str) -> dict | None:
    path = _cache_path(user_id)
    if not os.path.exists(path):
        return None
    try:
        with open(path) as f:
            payload = json.load(f)
    except (json.JSONDecodeError, OSError):
        return None

    if time.time() > payload.get("expires_at", 0):
        os.remove(path)
        return None

    return payload.get("data")


def invalidate_cache(user_id: str) -> None:
    path = _cache_path(user_id)
    if os.path.exists(path):
        os.remove(path)
