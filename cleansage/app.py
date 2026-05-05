import os
from flask import Flask, redirect, request, session, render_template, jsonify, url_for
from dotenv import load_dotenv

load_dotenv()

from auth import get_auth_url, handle_callback
from signal import load_profile, save_profile, update_field
from database import get_user, create_user, update_user
from tips import generate_tips, _detect_persona

app = Flask(__name__)
app.secret_key = os.getenv("FLASK_SECRET_KEY", "dev-secret-change-me")


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/auth/login")
def auth_login():
    user_id = session.get("user_id")
    if not user_id:
        # Generate a temporary session-based user ID for anonymous visitors
        import uuid
        user_id = str(uuid.uuid4())
        session["user_id"] = user_id

    auth_url = get_auth_url(user_id)
    return redirect(auth_url)


@app.route("/auth/callback")
def auth_callback():
    code = request.args.get("code")
    state = request.args.get("state")  # user_id

    if not code or not state:
        return redirect(url_for("index"))

    user_id = handle_callback(code, state)
    session["user_id"] = user_id
    session["authenticated"] = True

    # Ensure user row exists in DB (email resolved later on first scan)
    if not get_user(user_id):
        create_user(user_id, email="")

    # Skip onboarding if already done
    user = get_user(user_id)
    if user and user.get("onboarding_done"):
        return redirect(url_for("dashboard"))

    return redirect(url_for("onboard"))


@app.route("/onboard")
def onboard():
    if not session.get("authenticated"):
        return redirect(url_for("index"))
    return render_template("onboard.html")


@app.route("/onboard/complete", methods=["POST"])
def onboard_complete():
    if not session.get("authenticated"):
        return redirect(url_for("index"))

    user_id = session["user_id"]

    answers = {
        "whatsapp_backup":    request.form.get("whatsapp_backup"),
        "photos_quality":     request.form.get("photos_quality"),
        "whatsapp_autosave":  request.form.get("whatsapp_autosave"),
        "daily_email_volume": request.form.get("daily_email_volume"),
        "last_cleaned":       request.form.get("last_cleaned"),
        "primary_pain":       request.form.get("primary_pain"),
    }

    # Map answers → signal profile fields
    profile = load_profile(user_id)

    wa_backup = answers.get("whatsapp_backup")
    profile["whatsapp_backup_on_drive"] = (
        True if wa_backup == "yes" else
        False if wa_backup == "no" else None
    )

    photos_q = answers.get("photos_quality")
    profile["photos_original_quality"] = (
        True if photos_q == "original" else
        False if photos_q == "storage_saver" else None
    )

    vol_map = {"under_20": 10, "20_100": 60, "100_plus": 150}
    profile["daily_email_volume"] = vol_map.get(answers.get("daily_email_volume"))

    profile["last_cleaned"] = answers.get("last_cleaned")
    profile["primary_pain"] = answers.get("primary_pain")

    persona = _detect_persona(answers)
    profile["persona"] = persona

    save_profile(user_id, profile)
    update_user(user_id, persona=persona, onboarding_done=1)

    # Generate and persist tips
    generate_tips(user_id, answers)

    return redirect(url_for("dashboard"))


@app.route("/dashboard")
def dashboard():
    if not session.get("authenticated"):
        return redirect(url_for("index"))
    return render_template("dashboard.html")


@app.route("/health")
def health():
    return jsonify({"status": "ok"})


if __name__ == "__main__":
    app.run(debug=False, host="0.0.0.0", port=5002)
