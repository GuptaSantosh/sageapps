"""
MailSage — Claude API
"""

import os
import logging
from anthropic import Anthropic
from dotenv import load_dotenv

load_dotenv()

log    = logging.getLogger(__name__)
client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))


def build_prompt(emails: list[dict], signal_profile: dict) -> str:
    priority_senders = signal_profile.get("priority_senders", [])
    alert_keywords   = signal_profile.get("alert_keywords", [])
    noise_filters    = signal_profile.get("noise_filters", [])

    email_text = ""
    for i, e in enumerate(emails, 1):
        email_text += f"""
{i}. From: {e['from']}
   Subject: {e['subject']}
   Snippet: {e['snippet']}
   Date: {e['date']}
"""

    prompt = f"""You are MailSage — an AI email assistant for Indian professionals.

User's Signal Profile:
- Priority senders (always highlight): {priority_senders if priority_senders else 'none set yet'}
- Alert keywords (flag if found): {alert_keywords if alert_keywords else 'none set yet'}
- Noise filters (deprioritise): {noise_filters if noise_filters else 'none set yet'}

Here are the user's recent emails:
{email_text}

Produce a structured brief in this EXACT format:

STATS: [count of ACTION REQUIRED emails] | [count of ALERT emails] | [count of FYI emails] | [count of NOISE emails]

🔴 ACTION REQUIRED ([count])
Emails where the user must reply, decide, pay, or act today.
Do NOT put security alerts or notifications here.
If none, write "None."
Format each as: 1. *Sender Name* — subject in 8 words or fewer — one-line action needed

⚡ ALERTS ([count])
Security alerts, login attempts, unauthorized access, OTPs, suspicious activity, password resets, AND emails from priority senders or matching alert keywords.
If none, write "None."
Format each as: 1. *Sender Name* — subject in 8 words or fewer — one-line summary

📬 FYI ([count])
Worth knowing, no action needed. Bank transactions, account updates, shipping, confirmations. Max 5.
Format each as: 1. *Sender Name* — subject in 8 words or fewer — one-line summary

🗑 NOISE SKIPPED
One line only — total count + brief categories e.g. "40 emails — newsletters, promos, job alerts"

Rules:
- ALWAYS start with the STATS line exactly as shown
- ALWAYS include subject line as the middle part of each entry
- Security/login/suspicious alerts ALWAYS go in ⚡ ALERTS, never in 🔴 ACTION REQUIRED
- Use numbered lists (1. 2. 3.) for all items, never bullet points or dashes
- Each section header must show the count in parentheses e.g. 🔴 ACTION REQUIRED (3)
- Bold every sender name using *sender* markdown e.g. *Google Cloud* — Verify account by Sep 1
- Keep every subject description to 8 words or fewer — cut filler words, be direct
- India-context aware (BSE, SEBI, NSDL, ITR, GST, UPI, NEFT always important)
- Amounts in ₹ where visible
"""
    return prompt


def parse_stats(brief_text: str) -> dict | None:
    """Extract stats from brief for header calculation."""
    for line in brief_text.split("\n"):
        if line.startswith("STATS:"):
            try:
                parts = line.replace("STATS:", "").strip().split("|")
                return {
                    "action":  int(parts[0].strip()),
                    "alerts":  int(parts[1].strip()),
                    "fyi":     int(parts[2].strip()),
                    "noise":   int(parts[3].strip()),
                }
            except:
                return None
    return None


def remove_stats_line(brief_text: str) -> str:
    """Remove the STATS line from brief before sending to user."""
    lines = brief_text.split("\n")
    return "\n".join(l for l in lines if not l.startswith("STATS:")).strip()


def build_header(stats: dict, total_emails: int, label: str) -> str:
    """
    Build stats header. Hide if noise ratio < 30% — not enough filtering to brag about.
    """
    if not stats:
        return ""

    key_emails  = stats["action"] + stats["alerts"] + stats["fyi"]
    noise_count = stats["noise"]
    total       = key_emails + noise_count

    if total == 0:
        return ""

    noise_ratio = noise_count / total
    if noise_ratio < 0.30:
        # Not enough noise filtered — don't show stat
        return ""

    return (
        f"📊 *{key_emails} key emails from {total_emails} total — "
        f"{noise_count} filtered out* | {label}\n\n"
    )


def get_brief(emails: list[dict], signal_profile: dict, label: str = "last 24 hours") -> str:
    if not emails:
        return "📭 No new emails in this period."

    prompt = build_prompt(emails, signal_profile)

    try:
        response = client.messages.create(
            model      = "claude-sonnet-4-5",
            max_tokens = 1000,
            messages   = [{"role": "user", "content": prompt}]
        )
        raw    = response.content[0].text
        stats  = parse_stats(raw)
        brief  = remove_stats_line(raw)
        header = build_header(stats, len(emails), label)
        return header + brief

    except Exception as e:
        log.error(f"Claude API call failed: {e}")
        return "❌ Brief generation failed. Try again in a moment."
