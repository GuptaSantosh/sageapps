import os
import json
import copy

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
os.makedirs(DATA_DIR, exist_ok=True)

DEFAULT_PROFILE = {
    "safe_senders": [],
    "safe_labels": ["STARRED", "IMPORTANT"],
    "auto_flag_categories": ["promotions", "social", "forums"],
    "size_threshold_mb": 5,
    "age_days_threshold": 90,
    "delete_mode": "trash",
    "whatsapp_backup_on_drive": None,
    "photos_original_quality": None,
    "daily_email_volume": None,
    "last_cleaned": None,
    "primary_pain": None,
    "persona": None,
}

VALID_PERSONAS = {"media_flood", "promo_hoarder", "drive_dumper", "even_spread"}
VALID_DELETE_MODES = {"trash", "permanent"}
VALID_CATEGORIES = {"promotions", "social", "forums", "updates", "spam"}

FIELD_VALIDATORS = {
    "safe_senders": lambda v: isinstance(v, list) and all(isinstance(s, str) for s in v),
    "safe_labels": lambda v: isinstance(v, list) and all(isinstance(s, str) for s in v),
    "auto_flag_categories": lambda v: isinstance(v, list) and all(c in VALID_CATEGORIES for c in v),
    "size_threshold_mb": lambda v: isinstance(v, (int, float)) and v > 0,
    "age_days_threshold": lambda v: isinstance(v, int) and v > 0,
    "delete_mode": lambda v: v in VALID_DELETE_MODES,
    "whatsapp_backup_on_drive": lambda v: v is None or isinstance(v, bool),
    "photos_original_quality": lambda v: v is None or isinstance(v, bool),
    "daily_email_volume": lambda v: v is None or (isinstance(v, int) and v >= 0),
    "last_cleaned": lambda v: v is None or isinstance(v, str),
    "primary_pain": lambda v: v is None or isinstance(v, str),
    "persona": lambda v: v is None or v in VALID_PERSONAS,
}


def _profile_path(user_id: str) -> str:
    return os.path.join(DATA_DIR, f"{user_id}_signal.json")


def _is_valid(profile: dict) -> bool:
    if not isinstance(profile, dict):
        return False
    for key, validator in FIELD_VALIDATORS.items():
        if key not in profile:
            return False
        try:
            if not validator(profile[key]):
                return False
        except Exception:
            return False
    return True


def load_profile(user_id: str) -> dict:
    path = _profile_path(user_id)
    if not os.path.exists(path):
        profile = copy.deepcopy(DEFAULT_PROFILE)
        save_profile(user_id, profile)
        return profile

    try:
        with open(path) as f:
            profile = json.load(f)
    except (json.JSONDecodeError, OSError):
        profile = copy.deepcopy(DEFAULT_PROFILE)
        save_profile(user_id, profile)
        return profile

    # Merge: add any new default keys missing from stored profile
    updated = False
    for key, default_val in DEFAULT_PROFILE.items():
        if key not in profile:
            profile[key] = copy.deepcopy(default_val)
            updated = True

    if not _is_valid(profile):
        profile = copy.deepcopy(DEFAULT_PROFILE)
        updated = True

    if updated:
        save_profile(user_id, profile)

    return profile


def save_profile(user_id: str, profile: dict) -> bool:
    """Validate then save. Returns True on success, False on invalid structure."""
    if not _is_valid(profile):
        return False

    path = _profile_path(user_id)

    # Write to a temp file first, then rename (atomic write = safe rollback)
    tmp_path = path + ".tmp"
    try:
        with open(tmp_path, "w") as f:
            json.dump(profile, f, indent=2)
        os.replace(tmp_path, path)
    except OSError:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
        return False

    return True


def update_field(user_id: str, key: str, value) -> bool:
    """Update a single field. Validates before saving. Returns True on success."""
    if key not in FIELD_VALIDATORS:
        return False

    try:
        if not FIELD_VALIDATORS[key](value):
            return False
    except Exception:
        return False

    profile = load_profile(user_id)
    last_good = copy.deepcopy(profile)

    profile[key] = value

    if not save_profile(user_id, profile):
        # Rollback to last known good state
        save_profile(user_id, last_good)
        return False

    return True


def get_persona(user_id: str) -> str | None:
    return load_profile(user_id).get("persona")
