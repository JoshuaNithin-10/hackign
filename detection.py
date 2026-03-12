import torch
import librosa
from transformers import Wav2Vec2FeatureExtractor, Wav2Vec2ForSequenceClassification

model_name = "superb/wav2vec2-base-superb-er"

feature_extractor = Wav2Vec2FeatureExtractor.from_pretrained(model_name)
model = Wav2Vec2ForSequenceClassification.from_pretrained(model_name)

audio_file = "test.wav"

speech, sr = librosa.load(audio_file, sr=16000)

inputs = feature_extractor(
    speech,
    sampling_rate=16000,
    return_tensors="pt",
    padding=True
)

with torch.no_grad():
    logits = model(**inputs).logits

probs = torch.nn.functional.softmax(logits, dim=-1)

labels = ["neutral","happy","angry","sad"]

for i, label in enumerate(labels):
    print(label, ":", float(probs[0][i]))