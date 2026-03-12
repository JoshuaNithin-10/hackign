from flask import Flask, request, jsonify, render_template_string
import joblib
import librosa
import numpy as np

app = Flask(__name__)
emotion_map = {
    0: "Neutral",
    1: "Happy",
    2: "Sad",
    3: "Angry",
    4: "Fear"
}
model = joblib.load("emotion_model.pkl")

def extract_features(file):
    audio, sample_rate = librosa.load(file, duration=3)
    mfcc = librosa.feature.mfcc(y=audio, sr=sample_rate, n_mfcc=40)
    mfcc_scaled = np.mean(mfcc.T, axis=0)
    return mfcc_scaled

@app.route("/")
def home():
    return '''
    <h2>Speech Emotion Detector</h2>
    <form action="/predict" method="post" enctype="multipart/form-data">
        <input type="file" name="file">
        <input type="submit" value="Predict Emotion">
    </form>
    '''

@app.route("/predict", methods=["POST"])
def predict():

    file = request.files["file"]

    feature = extract_features(file)
    feature = feature.reshape(1,-1)

    prediction = model.predict(feature)

    return f"<h3>Detected Emotion: {emotion_map[int(prediction[0])]}</h3>"

if __name__ == "__main__":
    app.run(debug=True)
