import firebase_admin
from firebase_admin import credentials, firestore

cred = credentials.Certificate("firebase-key.json")
firebase_admin.initialize_app(cred)

db = firestore.client()

def save_call(transcript, audio_emotion, text_emotion, priority):

    data = {
        "transcript": transcript,
        "audio_emotion": audio_emotion,
        "text_emotion": text_emotion,
        "priority": priority
    }

    db.collection("calls").add(data)

    print("Saved to Firebase")