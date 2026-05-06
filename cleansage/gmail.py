import re
import requests as _requests
from collections import defaultdict
from datetime import datetime, timezone

from google.auth.transport.requests import Request as _GoogleRequest
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

from database import save_scan_result, log_deletion
from cache import cache_scan, invalidate_cache

GMAIL_BASE  = "https://gmail.googleapis.com/gmail/v1/users/me"
DRIVE_BASE  = "https://www.googleapis.com/drive/v3"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _ensure_fresh(credentials):
    """Refresh token in-place if expired."""
    if credentials.expired and credentials.refresh_token:
        credentials.refresh(_GoogleRequest())


def _get(credentials, url: str, params: dict | None = None, timeout: int = 15) -> dict:
    """Direct GET to any Google API URL using Bearer token. Returns parsed JSON."""
    _ensure_fresh(credentials)
    resp = _requests.get(
        url,
        headers={"Authorization": f"Bearer {credentials.token}"},
        params=params or {},
        timeout=timeout,
    )
    resp.raise_for_status()
    return resp.json()


def _drive_service(credentials):
    return build("drive", "v3", credentials=credentials)


def _gmail_service(credentials):
    return build("gmail", "v1", credentials=credentials)


def _bytes_to_gb(b: int) -> float:
    return round(b / (1024 ** 3), 4)


def _bytes_to_mb(b: int) -> float:
    return round(b / (1024 ** 2), 2)


def _ts_to_date(ts_ms: str) -> str:
    try:
        return datetime.fromtimestamp(int(ts_ms) / 1000, tz=timezone.utc).strftime("%Y-%m-%d")
    except (ValueError, TypeError):
        return ""


def _extract_sender_domain(sender: str) -> str:
    match = re.search(r"@([\w.-]+)", sender)
    return match.group(1).lower() if match else sender.lower()


def _extract_sender_email(sender: str) -> str:
    match = re.search(r"<([^>]+)>", sender)
    return match.group(1).lower() if match else sender.lower()


def _get_header(headers: list, name: str) -> str:
    for h in headers:
        if h["name"].lower() == name.lower():
            return h["value"]
    return ""


def _list_messages_all(service, query: str, max_results: int) -> list:
    """Used by write operations that still use googleapiclient."""
    messages = []
    page_token = None
    while len(messages) < max_results:
        batch = min(500, max_results - len(messages))
        params = {
            "userId": "me",
            "q": query,
            "maxResults": batch,
            "fields": "messages(id,threadId),nextPageToken",
        }
        if page_token:
            params["pageToken"] = page_token
        resp = service.users().messages().list(**params).execute()
        messages.extend(resp.get("messages", []))
        page_token = resp.get("nextPageToken")
        if not page_token:
            break
    return messages


# ---------------------------------------------------------------------------
# 1. Storage quota  (Drive API via googleapiclient — works fine)
# ---------------------------------------------------------------------------

def get_storage_quota(credentials) -> dict:
    _ensure_fresh(credentials)
    service = _drive_service(credentials)
    about   = service.about().get(fields="storageQuota").execute()
    quota   = about.get("storageQuota", {})

    total    = int(quota.get("limit", 0))
    used     = int(quota.get("usage", 0))
    in_drive = int(quota.get("usageInDrive", 0))
    in_trash = int(quota.get("usageInDriveTrash", 0))

    gmail_used = max(0, used - in_drive - in_trash)
    drive_used = in_drive + in_trash

    total_gb  = _bytes_to_gb(total) if total else 15.0
    used_gb   = _bytes_to_gb(used)
    gmail_gb  = _bytes_to_gb(gmail_used)
    drive_gb  = _bytes_to_gb(drive_used)
    pct       = round((used / total * 100), 1) if total else 0.0

    return {
        "total_gb":     total_gb,
        "used_gb":      used_gb,
        "percent_used": pct,
        "gmail_gb":     gmail_gb,
        "drive_gb":     drive_gb,
        "photos_gb":    0.0,
    }


# ---------------------------------------------------------------------------
# 2. Large attachments  (direct requests — bypasses httplib2)
# ---------------------------------------------------------------------------

def get_large_attachments(credentials, threshold_mb: int = 5, max_results: int = 50) -> list:
    """
    Runs 3 date-bucketed queries so each result carries a date_bucket label:
      "5y+"    — before 2021/1/1
      "2-5y"   — 2021/1/1 – 2023/1/1
      "recent" — after 2023/1/1
    Per-bucket cap: max_results // 3 IDs; combined + sorted by size desc.
    Returns: [{message_id, sender, subject, date, size_mb, attachment_names, date_bucket}]
    """
    _ensure_fresh(credentials)
    base   = f"has:attachment larger:{threshold_mb}m"
    bucket_queries = [
        (f"{base} before:2021/1/1",                      "5y+"),
        (f"{base} after:2021/1/1 before:2023/1/1",       "2-5y"),
        (f"{base} after:2023/1/1",                        "recent"),
    ]
    per_bucket = max(1, max_results // 3)

    # Collect (stub_id, bucket) pairs across all three queries
    tagged_stubs: list[tuple[str, str]] = []
    seen: set[str] = set()

    for query, bucket in bucket_queries:
        try:
            list_resp = _get(credentials, f"{GMAIL_BASE}/messages", {
                "q":          query,
                "maxResults": per_bucket,
                "fields":     "messages(id)",
            })
        except Exception:
            continue

        for stub in list_resp.get("messages", []):
            mid = stub["id"]
            if mid not in seen:
                seen.add(mid)
                tagged_stubs.append((mid, bucket))

    results = []
    for msg_id, _query_bucket in tagged_stubs:
        try:
            msg = _get(credentials, f"{GMAIL_BASE}/messages/{msg_id}", {
                "format":          "metadata",
                "metadataHeaders": ["From", "Subject"],
                "fields":          "id,internalDate,sizeEstimate,payload/headers",
            })
        except Exception:
            continue

        size_mb = round(msg.get("sizeEstimate", 0) / (1024 ** 2), 2)
        if size_mb < threshold_mb:
            continue

        date    = _ts_to_date(msg.get("internalDate", "0"))
        headers = msg.get("payload", {}).get("headers", [])
        sender  = _get_header(headers, "From")
        subject = _get_header(headers, "Subject")

        # Derive bucket from actual message date, not query label
        if date < "2021-01-01":
            date_bucket = "5y+"
        elif date < "2023-01-01":
            date_bucket = "2-5y"
        else:
            date_bucket = "recent"

        results.append({
            "message_id":       msg_id,
            "sender":           sender,
            "subject":          subject,
            "date":             date,
            "size_mb":          size_mb,
            "attachment_names": [],   # not available in metadata format
            "date_bucket":      date_bucket,
        })

    results.sort(key=lambda x: x["size_mb"], reverse=True)
    return results


# ---------------------------------------------------------------------------
# 3. Bulk senders  (direct requests)
# ---------------------------------------------------------------------------

def get_bulk_senders(credentials, min_count: int = 2) -> list:
    """
    Single messages.list for category:promotions (maxResults=20),
    one metadata GET per result. Returns top 10 senders.
    """
    _ensure_fresh(credentials)
    try:
        list_resp = _get(credentials, f"{GMAIL_BASE}/messages", {
            "q":          "category:promotions",
            "maxResults": 20,
            "fields":     "messages(id)",
        })
    except Exception:
        return []

    stubs = list_resp.get("messages", [])
    sender_data: dict[str, dict] = defaultdict(lambda: {"count": 0, "category": ""})

    for stub in stubs:
        try:
            msg = _get(credentials, f"{GMAIL_BASE}/messages/{stub['id']}", {
                "format":          "metadata",
                "metadataHeaders": ["From"],
                "fields":          "payload/headers",
            })
        except Exception:
            continue

        sender = _get_header(msg.get("payload", {}).get("headers", []), "From")
        email  = _extract_sender_email(sender)
        if not email:
            continue
        sender_data[email]["count"] += 1
        if not sender_data[email]["category"]:
            sender_data[email]["category"] = "promotions"

    results = [
        {"sender": s, "count": d["count"], "category": d["category"]}
        for s, d in sender_data.items()
        if d["count"] >= min_count
    ]
    results.sort(key=lambda x: x["count"], reverse=True)
    return results[:10]


# ---------------------------------------------------------------------------
# 4. Spam and trash size  (direct requests)
# ---------------------------------------------------------------------------

def get_spam_and_trash_size(credentials) -> dict:
    """
    Uses labels.get for exact count, samples 5 messages for avg size.
    Two label lookups + 10 message fetches total — fast.
    """
    _ensure_fresh(credentials)

    def _label_stats(label_id: str) -> tuple[int, float]:
        # Count from label info (one call)
        try:
            info = _get(credentials, f"{GMAIL_BASE}/labels/{label_id}")
            total_count = info.get("messagesTotal", 0)
        except Exception:
            total_count = 0

        if total_count == 0:
            return 0, 0.0

        # Sample 5 messages for avg size
        try:
            list_resp = _get(credentials, f"{GMAIL_BASE}/messages", {
                "q":          f"label:{label_id.lower()}",
                "maxResults": 5,
                "fields":     "messages(id)",
            })
        except Exception:
            return total_count, 0.0

        total_size = 0
        sampled    = 0
        for stub in list_resp.get("messages", []):
            try:
                msg = _get(credentials, f"{GMAIL_BASE}/messages/{stub['id']}", {
                    "format": "minimal",
                    "fields": "sizeEstimate",
                })
                total_size += msg.get("sizeEstimate", 0)
                sampled += 1
            except Exception:
                continue

        avg_size           = (total_size / sampled) if sampled else 0
        estimated_total_mb = _bytes_to_mb(int(avg_size * total_count))
        return total_count, estimated_total_mb

    spam_count,  spam_size_mb  = _label_stats("SPAM")
    trash_count, trash_size_mb = _label_stats("TRASH")

    return {
        "spam_count":    spam_count,
        "spam_size_mb":  spam_size_mb,
        "trash_count":   trash_count,
        "trash_size_mb": trash_size_mb,
    }


# ---------------------------------------------------------------------------
# 5. Old promotions  (direct requests)
# ---------------------------------------------------------------------------

def get_old_promotions(credentials, days: int = 90) -> dict:
    _ensure_fresh(credentials)
    query = f"category:promotions older_than:{days}d"

    # Count — use resultSizeEstimate from a maxResults=1 call
    try:
        count_resp = _get(credentials, f"{GMAIL_BASE}/messages", {
            "q":          query,
            "maxResults": 1,
            "fields":     "resultSizeEstimate",
        })
        count = count_resp.get("resultSizeEstimate", 0)
    except Exception:
        count = 0

    # Sample 20 for size + top senders
    try:
        list_resp = _get(credentials, f"{GMAIL_BASE}/messages", {
            "q":          query,
            "maxResults": 20,
            "fields":     "messages(id)",
        })
    except Exception:
        return {"count": count, "estimated_size_mb": 0.0, "sample_senders": []}

    stubs        = list_resp.get("messages", [])
    total_size   = 0
    sender_counts: dict[str, int] = defaultdict(int)

    for stub in stubs:
        try:
            msg = _get(credentials, f"{GMAIL_BASE}/messages/{stub['id']}", {
                "format":          "metadata",
                "metadataHeaders": ["From"],
                "fields":          "sizeEstimate,payload/headers",
            })
        except Exception:
            continue

        total_size += msg.get("sizeEstimate", 0)
        sender = _get_header(msg.get("payload", {}).get("headers", []), "From")
        sender_counts[_extract_sender_email(sender)] += 1

    avg_size          = (total_size / len(stubs)) if stubs else 0
    estimated_size_mb = _bytes_to_mb(int(avg_size * count))
    top_senders       = sorted(sender_counts, key=sender_counts.get, reverse=True)[:5]

    return {
        "count":             count,
        "estimated_size_mb": estimated_size_mb,
        "sample_senders":    top_senders,
    }


# ---------------------------------------------------------------------------
# 6. Full scan
# ---------------------------------------------------------------------------

def _safe_call(fn, default, *args, **kwargs):
    try:
        return fn(*args, **kwargs)
    except Exception:
        return default


def run_full_scan(user_id: str, credentials) -> dict:
    """
    Sequential scan via direct requests — no httplib2, no threads.
    Order: quota → spam_trash → large_attachments → old_promotions
    """
    quota = _safe_call(
        get_storage_quota,
        {"total_gb": 15.0, "used_gb": 0.0, "percent_used": 0.0,
         "gmail_gb": 0.0, "drive_gb": 0.0, "photos_gb": 0.0},
        credentials,
    )
    spam_trash = _safe_call(
        get_spam_and_trash_size,
        {"spam_count": 0, "spam_size_mb": 0.0, "trash_count": 0, "trash_size_mb": 0.0},
        credentials,
    )
    large_attach = _safe_call(
        get_large_attachments,
        [],
        credentials, threshold_mb=5, max_results=50,
    )
    old_promos = _safe_call(
        get_old_promotions,
        {"count": 0, "estimated_size_mb": 0.0, "sample_senders": []},
        credentials, days=90,
    )

    breakdown = {
        "quota":             quota,
        "spam_trash":        spam_trash,
        "large_attachments": large_attach,
        "old_promotions":    old_promos,
        "bulk_senders":      [],
    }

    save_scan_result(
        user_id=user_id,
        gmail_gb=quota["gmail_gb"],
        drive_gb=quota["drive_gb"],
        photos_gb=quota["photos_gb"],
        breakdown=breakdown,
    )

    cache_scan(user_id, breakdown, ttl=3600)
    return breakdown


# ---------------------------------------------------------------------------
# 7. Move to trash in bulk  (googleapiclient — write ops, unchanged)
# ---------------------------------------------------------------------------

def move_to_trash_bulk(user_id: str, credentials, message_items: list[dict]) -> dict:
    service       = _gmail_service(credentials)
    success_count = 0
    failed_count  = 0
    freed_mb      = 0.0

    for i in range(0, len(message_items), 100):
        for item in message_items[i:i + 100]:
            msg_id = item.get("message_id", "")
            if not msg_id:
                failed_count += 1
                continue
            try:
                service.users().messages().trash(userId="me", id=msg_id).execute()
                success_count += 1
                freed_mb += item.get("size_mb", 0.0)
                log_deletion(
                    user_id=user_id,
                    message_id=msg_id,
                    sender=item.get("sender", ""),
                    subject=item.get("subject", ""),
                    size_mb=item.get("size_mb", 0.0),
                    action_type="move_to_trash",
                    recoverable=True,
                )
            except HttpError:
                failed_count += 1

    invalidate_cache(user_id)
    return {
        "success_count":     success_count,
        "failed_count":      failed_count,
        "freed_mb_estimate": round(freed_mb, 2),
    }


def fetch_messages_for_preview(
    credentials,
    category: str,
    sender: str | None = None,
    max_results: int = 200,
) -> list[dict]:
    service = _gmail_service(credentials)

    if category == "large_attachments":
        query = "has:attachment larger:5m"
    elif category == "bulk_sender":
        if not sender:
            return []
        query = f"from:{sender}"
    elif category == "old_promotions":
        query = "category:promotions older_than:90d"
    else:
        return []

    stubs = _list_messages_all(service, query, max_results)
    results = []
    for stub in stubs:
        try:
            msg = service.users().messages().get(
                userId="me",
                id=stub["id"],
                format="metadata",
                metadataHeaders=["From", "Subject"],
                fields="id,internalDate,sizeEstimate,payload/headers",
            ).execute()
        except HttpError:
            continue

        headers = msg.get("payload", {}).get("headers", [])
        results.append({
            "message_id":       msg["id"],
            "sender":           _get_header(headers, "From"),
            "subject":          _get_header(headers, "Subject"),
            "date":             _ts_to_date(msg.get("internalDate", "0")),
            "size_mb":          _bytes_to_mb(msg.get("sizeEstimate", 0)),
            "attachment_names": [],
        })

    results.sort(key=lambda x: x["size_mb"], reverse=True)
    return results


# ---------------------------------------------------------------------------
# 8. Empty trash / spam  (googleapiclient — write ops, unchanged)
# ---------------------------------------------------------------------------

def empty_trash(user_id: str, credentials) -> dict:
    _ensure_fresh(credentials)
    service       = _gmail_service(credentials)
    stats         = get_spam_and_trash_size(credentials)
    freed_mb      = stats["trash_size_mb"]
    deleted_count = stats["trash_count"]

    try:
        service.users().messages().batchDelete(
            userId="me", body={"ids": [], "labelIds": ["TRASH"]}
        ).execute()
    except HttpError:
        stubs = _list_messages_all(service, "label:trash", max_results=5000)
        ids   = [s["id"] for s in stubs]
        for i in range(0, len(ids), 1000):
            try:
                service.users().messages().batchDelete(
                    userId="me", body={"ids": ids[i:i + 1000]}
                ).execute()
            except HttpError:
                pass

    invalidate_cache(user_id)
    return {"success": True, "freed_mb": freed_mb, "deleted_count": deleted_count}


def empty_spam(user_id: str, credentials) -> dict:
    _ensure_fresh(credentials)
    service       = _gmail_service(credentials)
    stats         = get_spam_and_trash_size(credentials)
    freed_mb      = stats["spam_size_mb"]
    deleted_count = stats["spam_count"]

    stubs = _list_messages_all(service, "label:spam", max_results=5000)
    ids   = [s["id"] for s in stubs]
    for i in range(0, len(ids), 1000):
        try:
            service.users().messages().batchDelete(
                userId="me", body={"ids": ids[i:i + 1000]}
            ).execute()
        except HttpError:
            pass

    invalidate_cache(user_id)
    return {"success": True, "freed_mb": freed_mb, "deleted_count": deleted_count}
