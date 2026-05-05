import base64
import re
from collections import defaultdict
from datetime import datetime, timezone

from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

from database import save_scan_result
from cache import cache_scan

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _drive_service(credentials):
    return build("drive", "v3", credentials=credentials)


def _gmail_service(credentials):
    return build("gmail", "v1", credentials=credentials)


def _bytes_to_gb(b: int) -> float:
    return round(b / (1024 ** 3), 4)


def _bytes_to_mb(b: int) -> float:
    return round(b / (1024 ** 2), 2)


def _ts_to_date(ts_ms: str) -> str:
    """Convert Gmail internalDate (ms since epoch) to YYYY-MM-DD string."""
    try:
        return datetime.fromtimestamp(int(ts_ms) / 1000, tz=timezone.utc).strftime("%Y-%m-%d")
    except (ValueError, TypeError):
        return ""


def _extract_sender_domain(sender: str) -> str:
    """'Display Name <user@domain.com>' → 'domain.com'"""
    match = re.search(r"@([\w.-]+)", sender)
    return match.group(1).lower() if match else sender.lower()


def _extract_sender_email(sender: str) -> str:
    """'Display Name <user@domain.com>' → 'user@domain.com'"""
    match = re.search(r"<([^>]+)>", sender)
    return match.group(1).lower() if match else sender.lower()


def _get_header(headers: list, name: str) -> str:
    for h in headers:
        if h["name"].lower() == name.lower():
            return h["value"]
    return ""


def _list_messages_all(service, query: str, max_results: int) -> list:
    """Paginate through Gmail messages.list, return up to max_results message stubs."""
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
# 1. Storage quota
# ---------------------------------------------------------------------------

def get_storage_quota(credentials) -> dict:
    """
    Returns total Google storage quota breakdown via Drive API about.get.
    Drive API is the only API that exposes the unified quota (Gmail + Drive + Photos).
    """
    service = _drive_service(credentials)
    about = service.about().get(fields="storageQuota").execute()
    quota = about.get("storageQuota", {})

    total    = int(quota.get("limit", 0))
    used     = int(quota.get("usage", 0))
    in_drive = int(quota.get("usageInDrive", 0))
    in_trash = int(quota.get("usageInDriveTrash", 0))

    # Drive API lumps Gmail under "usage" minus "usageInDrive".
    # Photos usage is not broken out separately by the API — we estimate:
    #   gmail_usage = usage - usageInDrive - usageInDriveTrash
    # Photos are stored in Drive so some overlap exists; best approximation.
    gmail_used  = max(0, used - in_drive - in_trash)
    drive_used  = in_drive + in_trash
    # Photos estimation: Drive API doesn't split photos from drive_used.
    # We return 0.0 for photos_gb here; gmail.py scan will refine later.
    photos_used = 0

    total_gb   = _bytes_to_gb(total) if total else 15.0  # default free tier
    used_gb    = _bytes_to_gb(used)
    gmail_gb   = _bytes_to_gb(gmail_used)
    drive_gb   = _bytes_to_gb(drive_used)
    photos_gb  = _bytes_to_gb(photos_used)
    pct        = round((used / total * 100), 1) if total else 0.0

    return {
        "total_gb":    total_gb,
        "used_gb":     used_gb,
        "percent_used": pct,
        "gmail_gb":    gmail_gb,
        "drive_gb":    drive_gb,
        "photos_gb":   photos_gb,
    }


# ---------------------------------------------------------------------------
# 2. Large attachments
# ---------------------------------------------------------------------------

def get_large_attachments(credentials, threshold_mb: int = 5, max_results: int = 50) -> list:
    """
    Returns emails with attachments larger than threshold_mb, newest first.
    Each item: {message_id, sender, subject, date, size_mb, attachment_names}
    """
    service = _gmail_service(credentials)
    query = f"has:attachment larger:{threshold_mb}m"

    stubs = _list_messages_all(service, query, max_results)
    if not stubs:
        return []

    results = []
    for stub in stubs:
        try:
            msg = service.users().messages().get(
                userId="me",
                id=stub["id"],
                format="metadata",
                metadataHeaders=["From", "Subject", "Date"],
                fields="id,internalDate,sizeEstimate,payload(headers,parts)",
            ).execute()
        except HttpError:
            continue

        headers = msg.get("payload", {}).get("headers", [])
        parts   = msg.get("payload", {}).get("parts", [])

        attachment_names = [
            p["filename"]
            for p in parts
            if p.get("filename") and p.get("body", {}).get("attachmentId")
        ]

        results.append({
            "message_id":       msg["id"],
            "sender":           _get_header(headers, "From"),
            "subject":          _get_header(headers, "Subject"),
            "date":             _ts_to_date(msg.get("internalDate", "0")),
            "size_mb":          _bytes_to_mb(msg.get("sizeEstimate", 0)),
            "attachment_names": attachment_names,
        })

    results.sort(key=lambda x: x["size_mb"], reverse=True)
    return results


# ---------------------------------------------------------------------------
# 3. Bulk senders
# ---------------------------------------------------------------------------

def get_bulk_senders(credentials, min_count: int = 50) -> list:
    """
    Fetches last 500 message metadata, groups by sender domain,
    returns senders above min_count threshold sorted by count desc.
    Each item: {sender, count, oldest_date, newest_date, estimated_size_mb}
    """
    service = _gmail_service(credentials)
    stubs = _list_messages_all(service, "in:anywhere", 500)
    if not stubs:
        return []

    # Batch-fetch metadata (sender + date + size) in groups of 100
    domain_data: dict[str, dict] = defaultdict(lambda: {
        "count": 0,
        "dates": [],
        "total_size": 0,
        "display_sender": "",
    })

    for i in range(0, len(stubs), 100):
        batch_ids = [s["id"] for s in stubs[i:i + 100]]
        for msg_id in batch_ids:
            try:
                msg = service.users().messages().get(
                    userId="me",
                    id=msg_id,
                    format="metadata",
                    metadataHeaders=["From"],
                    fields="id,internalDate,sizeEstimate,payload/headers",
                ).execute()
            except HttpError:
                continue

            sender = _get_header(msg.get("payload", {}).get("headers", []), "From")
            domain = _extract_sender_domain(sender)
            date   = _ts_to_date(msg.get("internalDate", "0"))
            size   = msg.get("sizeEstimate", 0)

            d = domain_data[domain]
            d["count"] += 1
            d["total_size"] += size
            if date:
                d["dates"].append(date)
            if not d["display_sender"]:
                d["display_sender"] = _extract_sender_email(sender)

    results = []
    for domain, d in domain_data.items():
        if d["count"] < min_count:
            continue
        dates = sorted(d["dates"])
        results.append({
            "sender":             d["display_sender"] or domain,
            "count":              d["count"],
            "oldest_date":        dates[0] if dates else "",
            "newest_date":        dates[-1] if dates else "",
            "estimated_size_mb":  _bytes_to_mb(d["total_size"]),
        })

    results.sort(key=lambda x: x["count"], reverse=True)
    return results


# ---------------------------------------------------------------------------
# 4. Spam and trash size
# ---------------------------------------------------------------------------

def get_spam_and_trash_size(credentials) -> dict:
    """
    Returns count + estimated size for SPAM and TRASH labels.
    sizeEstimate not returned by messages.list — we sample up to 100 msgs each.
    """
    service = _gmail_service(credentials)

    def _label_stats(label_id: str) -> tuple[int, float]:
        # Get total count from label metadata
        try:
            label_info = service.users().labels().get(
                userId="me", id=label_id
            ).execute()
            total_count = label_info.get("messagesTotal", 0)
        except HttpError:
            total_count = 0

        # Sample up to 100 messages to estimate average size
        stubs = _list_messages_all(service, f"label:{label_id.lower()}", 100)
        total_size = 0
        sampled = 0
        for stub in stubs:
            try:
                msg = service.users().messages().get(
                    userId="me",
                    id=stub["id"],
                    format="minimal",
                    fields="sizeEstimate",
                ).execute()
                total_size += msg.get("sizeEstimate", 0)
                sampled += 1
            except HttpError:
                continue

        avg_size = (total_size / sampled) if sampled else 0
        estimated_total_mb = _bytes_to_mb(int(avg_size * total_count))
        return total_count, estimated_total_mb

    spam_count, spam_size_mb  = _label_stats("SPAM")
    trash_count, trash_size_mb = _label_stats("TRASH")

    return {
        "spam_count":   spam_count,
        "spam_size_mb": spam_size_mb,
        "trash_count":  trash_count,
        "trash_size_mb": trash_size_mb,
    }


# ---------------------------------------------------------------------------
# 5. Old promotions
# ---------------------------------------------------------------------------

def get_old_promotions(credentials, days: int = 90) -> dict:
    """
    Counts promotional emails older than `days` days and returns top senders.
    """
    service = _gmail_service(credentials)
    query = f"category:promotions older_than:{days}d"

    # Get total count first (cheap)
    try:
        resp = service.users().messages().list(
            userId="me", q=query, maxResults=1,
            fields="resultSizeEstimate",
        ).execute()
        count = resp.get("resultSizeEstimate", 0)
    except HttpError:
        count = 0

    # Sample 100 to estimate size + top senders
    stubs = _list_messages_all(service, query, 100)
    total_size = 0
    sender_counts: dict[str, int] = defaultdict(int)

    for stub in stubs:
        try:
            msg = service.users().messages().get(
                userId="me",
                id=stub["id"],
                format="metadata",
                metadataHeaders=["From"],
                fields="sizeEstimate,payload/headers",
            ).execute()
        except HttpError:
            continue

        total_size += msg.get("sizeEstimate", 0)
        sender = _get_header(msg.get("payload", {}).get("headers", []), "From")
        sender_counts[_extract_sender_email(sender)] += 1

    avg_size = (total_size / len(stubs)) if stubs else 0
    estimated_size_mb = _bytes_to_mb(int(avg_size * count))

    top_senders = sorted(sender_counts, key=sender_counts.get, reverse=True)[:5]

    return {
        "count":              count,
        "estimated_size_mb":  estimated_size_mb,
        "sample_senders":     top_senders,
    }


# ---------------------------------------------------------------------------
# 6. Full scan
# ---------------------------------------------------------------------------

def run_full_scan(user_id: str, credentials) -> dict:
    """
    Runs all scan functions, assembles a full breakdown dict,
    persists to database, and caches for 60 minutes.
    Returns the breakdown dict.
    """
    quota          = get_storage_quota(credentials)
    large_attach   = get_large_attachments(credentials, threshold_mb=5, max_results=50)
    bulk_senders   = get_bulk_senders(credentials, min_count=50)
    spam_trash     = get_spam_and_trash_size(credentials)
    old_promos     = get_old_promotions(credentials, days=90)

    breakdown = {
        "quota":            quota,
        "large_attachments": large_attach,
        "bulk_senders":     bulk_senders,
        "spam_trash":       spam_trash,
        "old_promotions":   old_promos,
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
