"""
MailSage — OAuth Auth Server
"""

import os
import json
import logging
from pathlib import Path
from flask import Flask, request
from google_auth_oauthlib.flow import Flow
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
log = logging.getLogger(__name__)

CREDENTIALS_PATH = os.getenv("GOOGLE_CREDENTIALS_PATH")
CALLBACK_URL     = os.getenv("CALLBACK_URL")
DATA_DIR         = Path("/home/mailsage/mailsage/data")
SCOPES           = ["https://www.googleapis.com/auth/gmail.readonly"]


def get_token_path(user_id: str) -> Path:
    return DATA_DIR / f"{user_id}_token.json"

def get_verifier_path(user_id: str) -> Path:
    return DATA_DIR / f"{user_id}_verifier.txt"


def get_auth_url(telegram_user_id: str) -> str:
    flow = Flow.from_client_secrets_file(
        CREDENTIALS_PATH,
        scopes=SCOPES,
        redirect_uri=CALLBACK_URL,
    )
    auth_url, _ = flow.authorization_url(
        access_type="offline",
        prompt="consent",
        state=str(telegram_user_id),
    )
    # Save code_verifier — PKCE requires it in token exchange
    verifier = getattr(flow, "code_verifier", None)
    log.info(f"code_verifier for {telegram_user_id}: {verifier}")
    if verifier:
        get_verifier_path(str(telegram_user_id)).write_text(verifier)
    else:
        # No PKCE — write empty marker so callback knows
        get_verifier_path(str(telegram_user_id)).write_text("NONE")
    return auth_url


@app.route("/callback")
def callback():
    state = request.args.get("state")
    code  = request.args.get("code")
    error = request.args.get("error")

    if error:
        return f"<h2>Auth failed: {error}</h2><p>Try /auth again in Telegram.</p>", 400

    if not state or not code:
        return "<h2>Invalid request.</h2>", 400

    try:
        # Load saved code_verifier
        vpath = get_verifier_path(state)
        code_verifier = None
        if vpath.exists():
            val = vpath.read_text().strip()
            code_verifier = val if val != "NONE" else None
            vpath.unlink()

        log.info(f"Callback for {state}, code_verifier present: {code_verifier is not None}")

        flow = Flow.from_client_secrets_file(
            CREDENTIALS_PATH,
            scopes=SCOPES,
            redirect_uri=CALLBACK_URL,
            state=state,
        )

        if code_verifier:
            flow.code_verifier = code_verifier

        flow.fetch_token(code=code)
        creds = flow.credentials

        token_data = {
            "token":         creds.token,
            "refresh_token": creds.refresh_token,
            "token_uri":     creds.token_uri,
            "client_id":     creds.client_id,
            "client_secret": creds.client_secret,
            "scopes":        list(creds.scopes) if creds.scopes else [],
        }

        get_token_path(state).write_text(json.dumps(token_data, indent=2))
        log.info(f"Token saved for user {state}")

        return """
            <h2>✅ Gmail connected successfully!</h2>
            <p>Go back to Telegram and send <b>/brief</b> to get your first email brief.</p>
        """, 200

    except Exception as e:
        log.error(f"Token exchange failed for user {state}: {e}")
        return f"<h2>Something went wrong.</h2><p>{e}</p>", 500


@app.route("/health")
def health():
    return {"status": "ok", "service": "mailsage-auth"}, 200


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    app.run(host="0.0.0.0", port=8080)
