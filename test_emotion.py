import librosa
import whisper
from transformers import pipeline
import warnings
import subprocess

warnings.filterwarnings("ignore")

try:
     
except ImportError:
    def save_call(*args, **kwargs):
        print("save_call triggered but firebase_db not found")


# -----------------------------
# Load Models Once
# -----------------------------

print("Loading models...")

speech_model = whisper.load_model("base")

audio_emotion_model = pipeline(
    "audio-classification",
    model="superb/wav2vec2-base-superb-er"
)

text_emotion_model = pipeline(
    "text-classification",
    model="j-hartmann/emotion-english-distilroberta-base"
)

print("Models loaded.")


# -----------------------------
# Main Analysis Function
# -----------------------------

def analyze_audio_file(audio_file_path):

    try:

        # -----------------------------
        # Convert webm to wav
        # -----------------------------
        if audio_file_path.endswith(".webm"):

            wav_path = audio_file_path.replace(".webm", ".wav")

            subprocess.run([
                "ffmpeg",
                "-y",
                "-i",
                audio_file_path,
                "-ar", "16000",
                "-ac", "1",
                wav_path
            ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

            proc_path = wav_path

        else:
            proc_path = audio_file_path


        # -----------------------------
        # Whisper Transcription
        # -----------------------------

        speech_result = speech_model.transcribe(proc_path)

        transcript = speech_result["text"].strip()

        print("Transcript:", transcript)


        # -----------------------------
        # Audio Emotion Detection
        # -----------------------------

        audio, sr = librosa.load(proc_path, sr=16000)

        audio_result = audio_emotion_model(audio)

        top_audio_emotion = max(audio_result, key=lambda x: x['score'])

        audio_emotion = top_audio_emotion['label']

        audio_confidence = top_audio_emotion['score'] * 100

        print("Audio Emotion:", audio_emotion)
        print("Audio Confidence:", audio_confidence)


        # -----------------------------
        # Text Emotion Detection
        # -----------------------------

        if transcript:

            text_result = text_emotion_model(transcript)

            text_emotion = text_result[0]['label']

            text_confidence = text_result[0]['score'] * 100

        else:

            text_emotion = "neutral"

            text_confidence = 100


        print("Text Emotion:", text_emotion)
        print("Text Confidence:", text_confidence)


        # -----------------------------
        # Risk Detection
        # -----------------------------

        keywords = ["help","attack","emergency","pain","fire","blood"]

        if any(word in transcript.lower() for word in keywords) \
                or audio_emotion in ["ang"] \
                or text_emotion in ["fear","anger"]:

            priority = "HIGH"

        elif audio_emotion == "sad" or text_emotion == "sadness":

            priority = "MEDIUM"

        else:

            priority = "LOW"


        print("Priority Level:", priority)


        # -----------------------------
        # Save to Firebase
        # -----------------------------

        save_call(transcript, audio_emotion, text_emotion, priority)


        # -----------------------------
        # Return result to frontend
        # -----------------------------

        return {

            "transcript": transcript,

            "audio_emotion": audio_emotion,

            "audio_confidence": round(audio_confidence,2),

            "text_emotion": text_emotion,

            "text_confidence": round(text_confidence,2),

            "priority": priority

        }


    except Exception as e:

        print("Error:", e)

        return {"error": str(e)}


# -----------------------------
# Local testing (optional)
# -----------------------------

if __name__ == "__main__":

    result = analyze_audio_file("live_audio.wav")

    print(result)