from database import save_tip

# Tip card definitions keyed by condition
_TIP_CATALOG = {
    "whatsapp_backup_fix": {
        "tip_key": "whatsapp_backup_fix",
        "title": "Stop the WhatsApp backup leak",
        "body": (
            "Your WhatsApp is backing up media and messages to Google Drive. "
            "For heavy chat users this silently consumes 5–20 GB over time."
        ),
        "effort": "2 minutes",
        "savings_estimate": "Could free 5–15 GB",
        "how_to": "WhatsApp → Settings → Chats → Chat Backup → Back up to Google Drive → set to Never",
        "category": "drive",
    },
    "photos_original_quality": {
        "tip_key": "photos_original_quality",
        "title": "Switch Google Photos to Storage Saver",
        "body": (
            "Original quality photos count against your Google storage quota. "
            "Storage Saver (formerly High Quality) compresses photos slightly "
            "but looks identical on phone screens — and stops the storage drain."
        ),
        "effort": "1 minute",
        "savings_estimate": "Stops future accumulation; existing photos stay compressed on re-upload",
        "how_to": "Google Photos app → Profile icon → Photos settings → Backup quality → Storage Saver",
        "category": "photos",
    },
    "photos_quality_unknown": {
        "tip_key": "photos_quality_unknown",
        "title": "Check your Google Photos backup quality",
        "body": (
            "You're not sure which backup quality Google Photos is using. "
            "If it's set to Original, every photo and video eats into your 15 GB free quota."
        ),
        "effort": "1 minute",
        "savings_estimate": "Potential to stop significant ongoing storage growth",
        "how_to": "Google Photos app → Profile icon → Photos settings → Backup quality",
        "category": "photos",
    },
    "whatsapp_autosave_fix": {
        "tip_key": "whatsapp_autosave_fix",
        "title": "Stop WhatsApp group media flooding your gallery",
        "body": (
            "WhatsApp group chats auto-save every forwarded photo and video to your phone gallery, "
            "which then syncs to Google Photos — doubling the storage hit."
        ),
        "effort": "3 minutes",
        "savings_estimate": "Could free 1–5 GB depending on group activity",
        "how_to": "WhatsApp → Settings → Chats → Media visibility → turn off per group, or globally via phone Storage settings",
        "category": "photos",
    },
    "gmail_high_volume": {
        "tip_key": "gmail_high_volume",
        "title": "Unsubscribe from newsletters in bulk",
        "body": (
            "You're receiving 100+ emails a day. Most are newsletters and promotions "
            "you never read. Bulk-unsubscribing from the top 10 senders alone can cut "
            "inbox volume by 60%."
        ),
        "effort": "10 minutes",
        "savings_estimate": "Reduces ongoing storage growth significantly",
        "how_to": "Gmail → search 'unsubscribe' → sort by sender → unsubscribe from top senders",
        "category": "gmail",
    },
    "gmail_medium_volume": {
        "tip_key": "gmail_medium_volume",
        "title": "Delete promotional emails older than 1 year",
        "body": (
            "Your inbox receives 20–100 emails daily. Old promotions and newsletters "
            "you never re-read are quietly filling your storage quota."
        ),
        "effort": "5 minutes",
        "savings_estimate": "Could free 0.5–3 GB",
        "how_to": "Gmail → search: 'category:promotions older_than:1y' → Select all → Delete",
        "category": "gmail",
    },
    "gmail_never_cleaned": {
        "tip_key": "gmail_never_cleaned",
        "title": "Your Gmail has never been cleaned",
        "body": (
            "Years of emails with attachments accumulate fast. "
            "A single sweep of large, old attachments can free gigabytes in minutes."
        ),
        "effort": "15 minutes",
        "savings_estimate": "Could free 2–10 GB",
        "how_to": "Gmail → search: 'has:attachment larger:5mb older_than:2y' → review and delete in batches",
        "category": "gmail",
    },
    "gmail_old_cleanup": {
        "tip_key": "gmail_old_cleanup",
        "title": "It's been over a year — time for a Gmail sweep",
        "body": (
            "Over a year of accumulated emails with attachments is likely sitting in your inbox. "
            "Targeting emails with large attachments you no longer need is the fastest path to freed space."
        ),
        "effort": "10 minutes",
        "savings_estimate": "Could free 1–5 GB",
        "how_to": "Gmail → search: 'has:attachment larger:5mb older_than:1y' → review and delete",
        "category": "gmail",
    },
}


def _detect_persona(answers: dict) -> str:
    """Infer storage persona from onboarding answers."""
    pain = answers.get("primary_pain", "")
    volume = answers.get("daily_email_volume", "")
    backup = answers.get("whatsapp_backup", "")
    photos = answers.get("photos_quality", "")

    if pain in ("drive", "photos") or backup == "yes" or photos == "original":
        if pain == "gmail" or volume in ("20_100", "100_plus"):
            return "even_spread"
        return "drive_dumper"

    if volume == "100_plus" or pain == "gmail":
        return "promo_hoarder"

    if backup in ("yes", "not_sure") or photos in ("original", "not_sure"):
        return "media_flood"

    return "even_spread"


def generate_tips(user_id: str, answers: dict) -> list[dict]:
    """
    Map onboarding answers to tip cards.
    Saves each tip to the database and returns the list of tip dicts.
    """
    tips = []

    def add(key: str):
        card = _TIP_CATALOG.get(key)
        if card:
            save_tip(user_id, key, card)
            tips.append(card)

    # WhatsApp Drive backup
    wa_backup = answers.get("whatsapp_backup")
    if wa_backup in ("yes", "not_sure"):
        add("whatsapp_backup_fix")

    # Photos quality
    photos_q = answers.get("photos_quality")
    if photos_q == "original":
        add("photos_original_quality")
    elif photos_q == "not_sure":
        add("photos_quality_unknown")

    # WhatsApp auto-save to gallery
    if answers.get("whatsapp_autosave") == "yes":
        add("whatsapp_autosave_fix")

    # Email volume
    volume = answers.get("daily_email_volume")
    if volume == "100_plus":
        add("gmail_high_volume")
    elif volume == "20_100":
        add("gmail_medium_volume")

    # Last cleaned
    last_cleaned = answers.get("last_cleaned")
    if last_cleaned == "never":
        add("gmail_never_cleaned")
    elif last_cleaned == "over_year":
        add("gmail_old_cleanup")

    return tips
