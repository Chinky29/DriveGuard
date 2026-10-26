# DriveGuard Enhanced ML Service (Flask)

A decoupled Python microservice providing secondary, asynchronous machine learning inferences for the DriveGuard driver monitoring ecosystem:
1. **Facial Emotion Recognition**: Evaluates secondary emotional state (neutral, happy, sad, surprise, fatigue cues) via DeepFace.
2. **Deep Eye State Classification**: Evaluates eye openness probability via an ultra-lightweight Convolutional Neural Network (CNN).

---

## 1. Architectural Separation & Privacy Guarantee

- **Optional Cloud / Sidecar Only**: The DriveGuard web application is edge-first and runs 100% locally in browser WebAssembly memory by default.
- **Explicit Driver Consent**: This service is **never called** unless the driver explicitly turns on **Enhanced Mode** in the Settings page.
- **Volatile Processing**: When Enhanced Mode is enabled, the client sends only a small cropped eye or face thumbnail every 2 seconds. The image is evaluated in RAM and immediately discarded without disk storage.
- **Non-blocking Weak Signal**: Predictions from this service are treated strictly as secondary weak signals (weight <= 5–10% of total score). Primary driver fatigue decisions remain anchored to client-side calibrated EAR, PERCLOS, and head pose.
- **Graceful Fallback**: If this service is offline or times out, the Next.js client seamlessly falls back to pure on-device detection without interruption.

---

## 2. Legacy Model & Licensing Assessment

Per the audit in [docs/legacy-audit.md](file:///c:/Users/CHINKY/Documents/New%20folder/DriveGuard/docs/legacy-audit.md):
- **Licensing Constraint**: The reference repository (`/legacy`) has **NO license grant**. Under copyright law, all rights are reserved by the original creator. Direct code, weights, or dataset reuse is prohibited.
- **Technical Bottlenecks**: The legacy model `drowsiness_mobilenetv2.keras` (11.7 MB) requires synchronous MobileNetV2 forwards on CPU, creating severe frame-rate drops (<10 FPS) and arbitrary point scoring.
- **Clean-Room Solution**: We provide a modern, clean-room 45,000-parameter CNN (`eye_model.py`) requiring only ~180 KB of memory with sub-millisecond inference latency, accompanied by a reproducible training script ([train_eye_cnn.py](file:///c:/Users/CHINKY/Documents/New%20folder/DriveGuard/services/python/train_eye_cnn.py)) and training notebook ([train_eye_cnn.ipynb](file:///c:/Users/CHINKY/Documents/New%20folder/DriveGuard/services/python/train_eye_cnn.ipynb)).

---

## 3. API Endpoints

### 1. `GET /health`
Returns service availability, version, and component status.
```bash
curl http://localhost:5001/health
```
**Response:**
```json
{
  "status": "ok",
  "service": "driveguard-enhanced-ml",
  "version": "1.0.0",
  "eye_cnn_ready": true,
  "deepface_available": true,
  "timestamp": 1729987200.0
}
```

### 2. `POST /predict-emotion`
Accepts a cropped face image as base64 string or multipart file and returns emotion probabilities.
```bash
curl -X POST http://localhost:5001/predict-emotion \
  -H "Content-Type: application/json" \
  -d '{"image": "data:image/jpeg;base64,..."}'
```
**Response:**
```json
{
  "dominant_emotion": "neutral",
  "emotion_probabilities": {
    "neutral": 0.825,
    "happy": 0.045,
    "sad": 0.065,
    "surprise": 0.025,
    "fear": 0.020,
    "angry": 0.010,
    "disgust": 0.010
  },
  "engine": "deepface"
}
```

### 3. `POST /predict-eye`
Accepts a cropped eye image and returns open/closed probabilities.
```bash
curl -X POST http://localhost:5001/predict-eye \
  -H "Content-Type: application/json" \
  -d '{"image": "data:image/jpeg;base64,..."}'
```
**Response:**
```json
{
  "open_probability": 0.9412,
  "closed_probability": 0.0588,
  "is_closed": false,
  "engine": "pytorch_lightweight_cnn"
}
```

---

## 4. Run Instructions

### Option A: Local Python Environment
```bash
cd services/python
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
python app.py
```
Service starts on `http://localhost:5001`.

### Option B: Docker Container
```bash
cd services/python
docker build -t driveguard-ml-service .
docker run -p 5001:5001 driveguard-ml-service
```

### Option C: Training the Eye State Model
To train on a physical dataset (e.g. MRL Eye Dataset):
```bash
python train_eye_cnn.py --dataset_dir /path/to/dataset --epochs 15
```
To run a fast verification training using synthetic fixtures:
```bash
python train_eye_cnn.py --synthetic --epochs 5
```
Or open the interactive Jupyter notebook:
```bash
jupyter notebook train_eye_cnn.ipynb
```
