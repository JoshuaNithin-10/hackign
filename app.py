from flask import Flask, request, jsonify, render_template
import os
from test_emotion import analyze_audio_file

app = Flask(__name__)

UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/analyze_audio", methods=["POST"])
def analyze_audio():

    if "audio" not in request.files:
        return jsonify({"error": "No audio file received"})

    audio = request.files["audio"]

    path = os.path.join(UPLOAD_FOLDER, "chunk.webm")
    audio.save(path)

    result = analyze_audio_file(path)

    return jsonify(result)


if __name__ == "__main__":
    app.run(debug=True)