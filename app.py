from flask import Flask, render_template, Response, request, jsonify
from test_emotion import analyze_audio_file
import json
import time
import os

app = Flask(__name__)

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/analyze_audio", methods=["POST"])
def analyze_audio():
    if "audio" not in request.files:
        return jsonify({"error": "No audio file provided"}), 400
    
    file = request.files["audio"]
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
        
    temp_path = "temp_upload.webm"
    file.save(temp_path)
    
    # Process the audio file using the models
    result = analyze_audio_file(temp_path)
    
    # Clean up temp file
    if os.path.exists(temp_path):
        os.remove(temp_path)
        
    return jsonify(result)

# Keeping stream for backward compatibility if needed, though broken right now due to removed generator
@app.route("/stream")
def stream():
    def event_stream():
        # Fallback to prevent app crash if this is accessed
        yield f"data: {json.dumps({'status': 'stream deprecated'})}\n\n"

    return Response(event_stream(), mimetype="text/event-stream")


if __name__ == "__main__":
    app.run(debug=True)