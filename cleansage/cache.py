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


def patch_cache_after_delete(user_id: str, deleted_ids: list) -> None:
    """Update cache after delete — works with both summary dict and array."""
    cached = get_cached_scan(user_id)
    if not cached:
        return

    la = cached.get("large_attachments", {})

    # If it's a summary dict, just decrement the count
    if isinstance(la, dict):
        removed = len(deleted_ids)
        old_count = la.get("count", 0)
        la["count"] = max(0, old_count - removed)
        freed_gb = round(la.get("estimated_gb", 0) * removed / max(1, old_count), 3)
        la["estimated_gb"] = round(la.get("estimated_gb", 0) - freed_gb, 2)
        cached["large_attachments"] = la
        # Also update quota
        if "quota" in cached:
            cached["quota"]["used_gb"] = round(max(0, cached["quota"].get("used_gb", 0) - freed_gb), 4)
            total = cached["quota"].get("total_gb", 15)
            cached["quota"]["percent_used"] = round(cached["quota"]["used_gb"] / total * 100, 1)
            cached["quota"]["gmail_gb"] = round(max(0, cached["quota"].get("gmail_gb", 0) - freed_gb), 4)

    # If it's a full array (legacy), filter out deleted IDs
    elif isinstance(la, list):
        deleted_set = set(deleted_ids)
        cached["large_attachments"] = [
            item for item in la
            if item.get("id") not in deleted_set
        ]

    cache_scan(user_id, cached)
