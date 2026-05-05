import os
from flask import Flask, redirect, request, session, render_template, jsonify, url_for
from dotenv import load_dotenv

load_dotenv()

from auth import get_auth_url, handle_callback

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

    return redirect(url_for("onboard"))


@app.route("/onboard")
def onboard():
    if not session.get("authenticated"):
        return redirect(url_for("index"))
    return render_template("onboard.html")


@app.route("/health")
def health():
    return jsonify({"status": "ok"})


if __name__ == "__main__":
    app.run(debug=False, host="0.0.0.0", port=5002)
