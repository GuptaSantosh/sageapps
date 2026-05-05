import os
import json
import secrets
import hashlib
import base64
import requests
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from google_auth_oauthlib.flow import Flow

os.environ["OAUTHLIB_RELAX_TOKEN_SCOPE"] = "1"

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
os.makedirs(DATA_DIR, exist_ok=True)

SCOPES = [
    "https://www.googleapis.com/auth/gmail.modify",
    "https://www.googleapis.com/auth/drive.readonly",
    "https://www.googleapis.com/auth/photoslibrary.readonly",
    "openid",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
]

CLIENT_CONFIG = {
    "web": {
        "client_id": os.getenv("GOOGLE_CLIENT_ID"),
        "client_secret": os.getenv("GOOGLE_CLIENT_SECRET"),
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token",
        "redirect_uris": [f"{os.getenv('BASE_URL', 'http://localhost:5000')}/auth/callback"],
    }
}


def _token_path(user_id: str) -> str:
    return os.path.join(DATA_DIR, f"{user_id}_tokens.json")


def _state_path(state: str) -> str:
    return os.path.join(DATA_DIR, f"oauth_state_{state}.json")


def _pkce_pair() -> tuple[str, str]:
    """Generate a PKCE code_verifier and its S256 code_challenge."""
    verifier = secrets.token_urlsafe(96)
    digest = hashlib.sha256(verifier.encode("ascii")).digest()
    challenge = base64.urlsafe_b64encode(digest).rstrip(b"=").decode("ascii")
    return verifier, challenge


def get_auth_url(user_id: str) -> str:
    verifier, challenge = _pkce_pair()

    # Persist verifier so handle_callback can retrieve it
    with open(_state_path(str(user_id)), "w") as f:
        json.dump({"code_verifier": verifier}, f)

    flow = Flow.from_client_config(
        CLIENT_CONFIG,
        scopes=SCOPES,
        redirect_uri=CLIENT_CONFIG["web"]["redirect_uris"][0],
    )
    auth_url, _ = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="consent",
        state=str(user_id),
        code_challenge=challenge,
        code_challenge_method="S256",
    )
    return auth_url


def handle_callback(code: str, state: str) -> str:
    """Exchange auth code for tokens, store them, return user_id (state)."""
    # Retrieve and delete the PKCE verifier persisted during get_auth_url
    state_file = _state_path(state)
    code_verifier = None
    if os.path.exists(state_file):
        try:
            with open(state_file) as f:
                code_verifier = json.load(f).get("code_verifier")
        finally:
            os.remove(state_file)

    flow = Flow.from_client_config(
        CLIENT_CONFIG,
        scopes=SCOPES,
        redirect_uri=CLIENT_CONFIG["web"]["redirect_uris"][0],
        state=state,
    )
    fetch_kwargs = {"code": code}
    if code_verifier:
        fetch_kwargs["code_verifier"] = code_verifier
    flow.fetch_token(**fetch_kwargs)
    creds = flow.credentials

    token_data = {
        "token": creds.token,
        "refresh_token": creds.refresh_token,
        "token_uri": creds.token_uri,
        "client_id": creds.client_id,
        "client_secret": creds.client_secret,
        "scopes": list(creds.scopes) if creds.scopes else SCOPES,
    }
    with open(_token_path(state), "w") as f:
        json.dump(token_data, f)

    return state  # user_id


def get_credentials(user_id: str) -> Credentials | None:
    """Return valid credentials for user, auto-refreshing if expired."""
    path = _token_path(user_id)
    if not os.path.exists(path):
        return None

    with open(path) as f:
        data = json.load(f)

    creds = Credentials(
        token=data["token"],
        refresh_token=data.get("refresh_token"),
        token_uri=data["token_uri"],
        client_id=data["client_id"],
        client_secret=data["client_secret"],
        scopes=data.get("scopes", SCOPES),
    )

    if creds.expired and creds.refresh_token:
        creds.refresh(Request())
        data["token"] = creds.token
        with open(path, "w") as f:
            json.dump(data, f)

    return creds if creds.valid else None


def revoke_access(user_id: str) -> bool:
    """Revoke OAuth token at Google + delete local token file."""
    path = _token_path(user_id)
    if not os.path.exists(path):
        return False

    with open(path) as f:
        data = json.load(f)

    token = data.get("token") or data.get("refresh_token")
    if token:
        try:
            requests.post(
                "https://oauth2.googleapis.com/revoke",
                params={"token": token},
                timeout=10,
            )
        except requests.RequestException:
            pass  # best-effort revoke

    os.remove(path)
    return True
