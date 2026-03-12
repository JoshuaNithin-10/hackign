from transformers import pipeline
import librosa
import whisper
import sounddevice as sd
from scipy.io.wavfile import write

# -----------------------------
# Record live audio
# -----------------------------
fs = 16000
seconds = 7

print("Speak now...")

recording = sd.rec(int(seconds * fs), samplerate=fs, channels=1)
sd.wait()

audio_file = "live_audio.wav"
write(audio_file, fs, recording)

print("Recording finished")

# -----------------------------
# Load Whisper speech model
# -----------------------------
speech_model = whisper.load_model("base")

speech_result = speech_model.transcribe(audio_file)
transcript = speech_result["text"]

print("Transcript:", transcript)

# -----------------------------
# Audio Emotion Detection
# -----------------------------
audio_emotion_model = pipeline(
    "audio-classification",
    model="superb/wav2vec2-base-superb-er"
)

audio, sr = librosa.load(audio_file, sr=16000)

audio_result = audio_emotion_model(audio)

top_audio_emotion = max(audio_result, key=lambda x: x['score'])

print("Audio Emotion:", top_audio_emotion['label'])
print("Audio Confidence:", top_audio_emotion['score'])

# -----------------------------
# Text Emotion Detection
# -----------------------------
text_emotion_model = pipeline(
    "text-classification",
    model="j-hartmann/emotion-english-distilroberta-base"
)

text_result = text_emotion_model(transcript)

print("Text Emotion:", text_result[0]['label'])
print("Text Confidence:", text_result[0]['score'])

# -----------------------------
# Risk Detection Logic
# -----------------------------
keywords = ["help","attack","emergency","pain","fire","blood"]

audio_emotion = top_audio_emotion['label']
text_emotion = text_result[0]['label']

if any(word in transcript.lower() for word in keywords) or audio_emotion in ["ang"] or text_emotion in ["fear","anger"]:
    priority = "HIGH"

elif audio_emotion == "sad" or text_emotion == "sadness":
    priority = "MEDIUM"

else:
    priority = "LOW"

print("Priority Level:", priority)