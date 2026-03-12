import librosa
import whisper
from transformers import pipeline
import time

speech_model = whisper.load_model("base")

audio_emotion_model = pipeline(
    "audio-classification",
    model="superb/wav2vec2-base-superb-er"
)

text_emotion_model = pipeline(
    "text-classification",
    model="j-hartmann/emotion-english-distilroberta-base"
)


def analyze_stream(audio_file):

    audio, sr = librosa.load(audio_file, sr=16000)

    chunk_size = sr   # 1 second
    results = []

    for i in range(0, len(audio), chunk_size):

        chunk = audio[i:i+chunk_size]

        if len(chunk) < chunk_size:
            break

        # audio emotion
        audio_result = audio_emotion_model(chunk)
        top_audio = max(audio_result, key=lambda x: x["score"])

        emotion = top_audio["label"]
        confidence = float(top_audio["score"])

        results.append({
            "emotion": emotion,
            "confidence": confidence,
            "time": i // sr
        })

        time.sleep(1)  # simulate real-time
    return results


def stream_analysis(audio_file):
    """Infinite generator that yields the results from :func:`analyze_stream`. """
    while True:
        for r in analyze_stream(audio_file):
            yield r
