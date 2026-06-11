import io
from flask import Flask, request, jsonify
from dotenv import load_dotenv
import ais_scanner

load_dotenv()

app = Flask(__name__)


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


@app.route("/scan", methods=["POST"])
def scan():
    pdf_file = request.files.get("pdf_file")
    pan = request.form.get("pan", "").strip()
    dob = request.form.get("dob", "").strip()

    if not pdf_file or not pan or not dob:
        return jsonify({"error": "missing_fields", "message": "pdf_file, pan, and dob are required."}), 400

    password = pan.lower() + dob
    pdf_bytes = pdf_file.read()

    result = ais_scanner.scan(pdf_bytes, password)
    return jsonify(result)


if __name__ == "__main__":
    app.run(port=5003)
