from flask import Flask, render_template, Response
from test_emotion import analyze_stream, stream_analysis
import json
import time

app = Flask(__name__)

@app.route("/")
def home():
    return render_template("index.html")


@app.route("/stream")
def stream():
    """Server‑sent events endpoint that continuously returns emotion data.

    The generator calls :func:`analyze_stream` in a loop until the
    application is stopped. Each result dictionary is JSON encoded and
    sent as a separate event so the frontend can process it in real time.
    """

    def event_stream():
        # generator from test_emotion that never terminates
        for r in stream_analysis("test.wav"):
            yield f"data: {json.dumps(r)}\n\n"
            # the analyze_stream inside the generator already sleeps per chunk

    return Response(event_stream(), mimetype="text/event-stream")


if __name__ == "__main__":
    app.run(debug=True)