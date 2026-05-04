"""
MailSage — Gmail Fetcher
Fetches emails using stored OAuth token per user.
"""

import json
import logging
from pathlib import Path
from datetime import datetime, timedelta
import pytz

from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build

log      = logging.getLogger(__name__)
DATA_DIR = Path("/home/mailsage/mailsage/data")


def _token_path(user_id: str) -> Path:
    return DATA_DIR / f"{user_id}_token.json"


def _load_credentials(user_id: str) -> Credentials:
    token_path = _token_path(str(user_id))
    if not token_path.exists():
        raise FileNotFoundError(f"No token found for user {user_id}")

    token_data = json.loads(token_path.read_text())
    creds = Credentials(
        token         = token_data["token"],
        refresh_token = token_data["refresh_token"],
        token_uri     = token_data["token_uri"],
        client_id     = token_data["client_id"],
        client_secret = token_data["client_secret"],
        scopes        = token_data["scopes"],
    )

    if creds.expired and creds.refresh_token:
        creds.refresh(Request())
        token_data["token"] = creds.token
        token_path.write_text(json.dumps(token_data, indent=2))
        log.info(f"Token refreshed for user {user_id}")

    return creds


def fetch_emails(user_id: str, lookback_days: int = 1, max_results: int = 50) -> list[dict]:
    """
    Fetch emails from Gmail for the past lookback_days.
    Returns list of simplified email dicts.
    """
    creds   = _load_credentials(str(user_id))
    service = build("gmail", "v1", credentials=creds)

    ist     = pytz.timezone("Asia/Kolkata")
    since   = datetime.now(ist) - timedelta(days=lookback_days)
    after   = int(since.timestamp())
    query   = f"after:{after}"

    result  = service.users().messages().list(
        userId    = "me",
        q         = query,
        maxResults = max_results
    ).execute()

    messages = result.get("messages", [])
    if not messages:
        return []

    emails = []
    for msg in messages:
        try:
            full = service.users().messages().get(
                userId  = "me",
                id      = msg["id"],
                format  = "metadata",
                metadataHeaders = ["From", "Subject", "Date"]
            ).execute()

            headers = {h["name"]: h["value"] for h in full["payload"]["headers"]}
            snippet = full.get("snippet", "")[:200]

            emails.append({
                "id":      msg["id"],
                "from":    headers.get("From", ""),
                "subject": headers.get("Subject", ""),
                "date":    headers.get("Date", ""),
                "snippet": snippet,
            })
        except Exception as e:
            log.warning(f"Failed to fetch message {msg['id']}: {e}")
            continue

    log.info(f"Fetched {len(emails)} emails for user {user_id}")
    return emails
