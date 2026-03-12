import librosa
import whisper
from transformers import pipeline
import subprocess
import warnings
import numpy as np
import soundfile as sf
import os

warnings.filterwarnings("ignore")

# Firebase optional
try:
    from firebase_db import save_call
except:
    def save_call(*args, **kwargs):
        print("Firebase disabled")

print("Loading AI models...")

# Load models once
speech_model = whisper.load_model("base")

audio_emotion_model = pipeline(
    "audio-classification",
    model="superb/wav2vec2-base-superb-er"
)

text_emotion_model = pipeline(
    "text-classification",
    model="j-hartmann/emotion-english-distilroberta-base"
)

print("Models loaded successfully")


def analyze_audio_file(audio_file_path):

    try:

        # ----------------------------------
        # Convert webm/ogg → wav
        # ----------------------------------
        wav_path = audio_file_path.rsplit(".", 1)[0] + ".wav"

        subprocess.run([
            "ffmpeg",
            "-y",
            "-i", audio_file_path,
            "-acodec", "pcm_s16le",
            "-ar", "16000",
            "-ac", "1",
            wav_path
        ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

        proc_path = wav_path

        print("Converted file:", proc_path)
        print("File size:", os.path.getsize(proc_path))


        # ----------------------------------
        # Load Audio
        # ----------------------------------
        audio, sr = librosa.load(proc_path, sr=16000)

        duration = len(audio) / sr
        max_amp = np.max(np.abs(audio))

        print("Audio duration:", duration)
        print("Max amplitude:", max_amp)


        # ----------------------------------
        # Silence Detection
        # ----------------------------------
        if max_amp < 0.015:

            print("Audio detected as silence")

            transcript = ""
            audio_emotion = "neu"
            audio_conf = 100.0

        else:

            # Normalize audio
            audio = audio / max_amp
            sf.write(proc_path, audio, sr)

            # ----------------------------------
            # Whisper Speech Recognition
            # ----------------------------------
            speech_result = speech_model.transcribe(
                proc_path,
                fp16=False,
                language="en",
                condition_on_previous_text=False
            )

            transcript = speech_result["text"].strip()

            print("Transcript:", transcript)


            # ----------------------------------
            # Audio Emotion Detection
            # ----------------------------------
            audio_result = audio_emotion_model(audio)

            top_audio = max(audio_result, key=lambda x: x["score"])

            audio_emotion = top_audio["label"]
            audio_conf = top_audio["score"] * 100

        print("Audio Emotion:", audio_emotion)
        print("Audio Confidence:", audio_conf)


        # ----------------------------------
        # Text Emotion Detection
        # ----------------------------------
        if transcript:

            text_result = text_emotion_model(transcript)

            text_emotion = text_result[0]["label"]
            text_conf = text_result[0]["score"] * 100

        else:

            text_emotion = "neutral"
            text_conf = 100.0

        print("Text Emotion:", text_emotion)
        print("Text Confidence:", text_conf)


        # ----------------------------------
        # Risk Detection Logic
        # ----------------------------------
        keywords = ["help", "attack", "emergency", "pain", "fire", "blood"]

        if any(word in transcript.lower() for word in keywords) \
                or audio_emotion in ["ang"] \
                or text_emotion in ["fear", "anger"]:

            priority = "HIGH"

        elif audio_emotion == "sad" or text_emotion == "sadness":

            priority = "MEDIUM"

        else:

            priority = "LOW"

        print("Priority:", priority)


        # ----------------------------------
        # Save to Firebase
        # ----------------------------------
        save_call(transcript, audio_emotion, text_emotion, priority)


        # ----------------------------------
        # Return JSON to frontend
        # ----------------------------------
        return {
            "transcript": transcript,
            "audio_emotion": audio_emotion,
            "audio_confidence": round(audio_conf, 2),
            "text_emotion": text_emotion,
            "text_confidence": round(text_conf, 2),
            "priority": priority
        }


    except Exception as e:

        print("Error:", e)

        return {
            "error": str(e)
        }