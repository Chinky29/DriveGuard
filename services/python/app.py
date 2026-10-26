"""
DriveGuard Enhanced ML Service (Flask)

Provides secondary cloud/sidecar inference for:
1. Facial emotion recognition via DeepFace (POST /predict-emotion)
2. Eye closure classification via Lightweight CNN (POST /predict-eye)
3. Health check (GET /health)

Security & Architecture Rules:
- Only enabled when driver explicitly consents in settings ("Enhanced mode").
- Decoupled from the core Next.js app: Core detection loop works completely offline.
- Graceful fallbacks and non-blocking timeouts prevent lag.
"""

import os
import io
import time
import base64
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image

from eye_model import EyeClassifier

app = Flask(__name__)
CORS(app)  # Allow local Next.js client requests

# Initialize Eye State Model
eye_classifier = EyeClassifier()

# Lazy-loaded DeepFace holder
_deepface_loaded = False


def decode_image_from_request(req) -> Image.Image:
    """
    Decodes an image from either JSON (base64 string / data URI) or multipart/form-data.
    """
    if req.is_json:
        data = req.get_json(silent=True) or {}
        img_str = data.get("image", "")
        if not img_str:
            raise ValueError("Missing 'image' field in JSON payload.")

        # Strip data URI prefix if present: data:image/jpeg;base64,...
        if "," in img_str:
            img_str = img_str.split(",", 1)[1]

        image_bytes = base64.b64decode(img_str)
        return Image.open(io.BytesIO(image_bytes))

    if "file" in req.files:
        file = req.files["file"]
        return Image.open(file.stream)

    raise ValueError("Request must be JSON with 'image' base64 or multipart/form-data with 'file'.")


@app.route("/health", methods=["GET"])
def health():
    """
    Service health check endpoint.
    """
    return jsonify({
        "status": "ok",
        "service": "driveguard-enhanced-ml",
        "version": "1.0.0",
        "eye_cnn_ready": True,
        "deepface_available": _check_deepface_available(),
        "timestamp": time.time(),
    }), 200


def _check_deepface_available() -> bool:
    try:
        import deepface
        return True
    except ImportError:
        return False


@app.route("/predict-emotion", methods=["POST"])
def predict_emotion():
    """
    POST /predict-emotion
    Accepts a cropped face image (base64 or file) and returns emotion probabilities.
    """
    try:
        image = decode_image_from_request(request)
    except Exception as e:
        return jsonify({"error": f"Invalid image input: {str(e)}"}), 400

    # Ensure RGB format
    rgb_image = image.convert("RGB")
    img_np = np.array(rgb_image)

    # Attempt DeepFace inference
    try:
        from deepface import DeepFace
        # enforce_detection=False allows inference even on tight pre-cropped faces
        result = DeepFace.analyze(
            img_path=img_np,
            actions=["emotion"],
            enforce_detection=False,
            silent=True
        )

        analysis = result[0] if isinstance(result, list) else result
        emotions = analysis.get("emotion", {})
        dominant = analysis.get("dominant_emotion", "neutral")

        # Convert emotion values to 0.0 - 1.0 scale
        total = sum(emotions.values()) or 100.0
        normalized_emotions = {k: round(v / total, 4) for k, v in emotions.items()}

        return jsonify({
            "dominant_emotion": dominant,
            "emotion_probabilities": normalized_emotions,
            "engine": "deepface",
        }), 200

    except Exception as e:
        # Graceful fallback: return neutral distribution with warning
        print(f"[DriveGuard ML] DeepFace inference fallback: {e}")
        return jsonify({
            "dominant_emotion": "neutral",
            "emotion_probabilities": {
                "neutral": 0.80,
                "happy": 0.05,
                "sad": 0.05,
                "surprise": 0.03,
                "fear": 0.03,
                "angry": 0.02,
                "disgust": 0.02,
            },
            "engine": "fallback_neutral",
            "note": "DeepFace not initialized or inference timed out; nominal fallback applied.",
        }), 200


@app.route("/predict-eye", methods=["POST"])
def predict_eye():
    """
    POST /predict-eye
    Accepts a cropped eye image (base64 or file) and returns open/closed probability.
    """
    try:
        image = decode_image_from_request(request)
    except Exception as e:
        return jsonify({"error": f"Invalid image input: {str(e)}"}), 400

    result = eye_classifier.predict(image)
    return jsonify(result), 200


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    print(f"[DriveGuard ML Service] Starting Flask service on port {port}...")
    app.run(host="0.0.0.0", port=port, debug=False)
