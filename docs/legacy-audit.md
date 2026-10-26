# Legacy Codebase Audit (`/legacy`)

**Date of Audit**: October 23, 2026  
**Auditor**: DriveGuard Lead Engineer  
**Source Repository**: `https://github.com/Kizxim/Driver-Drowsiness-detection-system.git`  
**Reference Status**: Read-only reference. Strictly no direct code copying.

---

## 1. Inventory & Technical Overview

| Attribute | Details |
| :--- | :--- |
| **Files** | `README.md`, `requirements.txt`, `realtime_drowsiness.py`, `train_drowsiness.py`, `drowsiness_mobilenetv2.keras`, `eye_model_training_curve.png` |
| **Language** | Python 3 |
| **Key Libraries** | TensorFlow/Keras (MobileNetV2), OpenCV (`cv2`), MediaPipe (`0.10.14`), NumPy, Matplotlib, Seaborn, Scikit-learn, Winsound |
| **License** | **NONE** (No `LICENSE` file present in repository. All rights reserved by author.) |
| **Target Platform** | Windows only (uses hardcoded `winsound.Beep` and `D:\FINAL PRJ\...` paths) |

---

## 2. Detection Methodology

The legacy system implements a hybrid pipeline:

1. **Face & Landmark Tracking**:
   * Uses legacy `mediapipe.solutions.face_mesh.FaceMesh` (`max_num_faces=1`, `refine_landmarks=True`).
   * Extracts 468+ facial coordinates.
2. **Eye Aspect Ratio (EAR)**:
   * 6-point Euclidean distance formula (Soukupová & Čech style):
     * Left Eye Landmarks: `[33, 160, 158, 133, 153, 144]`
     * Right Eye Landmarks: `[362, 385, 387, 263, 373, 380]`
   * Thresholds:
     * `EAR_LOW_THRESHOLD = 0.20`
     * `EAR_VERY_LOW_THRESHOLD = 0.16`
     * `OPEN_EYE_RESET_EAR = 0.22`
3. **CNN Eye State Classifier**:
   * Crops bounding box around eyes with fixed 20px padding (`LEFT_EYE_CROP`, `RIGHT_EYE_CROP`).
   * Resizes cropped eye to `(224, 224, 3)`, applies `mobilenet_v2.preprocess_input`.
   * Evaluates `drowsiness_mobilenetv2.keras` (MobileNetV2 backbone + GAP + Dense(128) + Dropout(0.5) + Dense(64) + Dropout(0.3) + Dense(1, Sigmoid)).
   * Output interpretation: Sigmoid output near 0 is classified as drowsy; converted via `1.0 - pred`.
   * Thresholds:
     * `CNN_DROWSY_THRESHOLD = 0.90`
     * `CNN_STRONG_DROWSY_THRESHOLD = 0.95`
4. **Head Pose Estimation**:
   * Uses `cv2.solvePnP` on 6 facial landmark points (Nose tip, Chin, Left/Right eye corners, Left/Right mouth corners).
   * Decomposes rotation matrix with `cv2.RQDecomp3x3` into Pitch, Yaw, Roll.
   * Thresholds:
     * `SIDE_HEAD_YAW_THRESHOLD = 25°`
     * `HEAD_DOWN_PITCH_THRESHOLD = 18°`

---

## 3. Alarm & Scoring Logic

The legacy system maintains a running integer state score `drowsiness_score` clamped between `0` and `15`:

* **Score Accumulation Rules**:
  * If turning head (`abs(yaw) > 25°`):
    * If `EAR < 0.16` and `CNN > 0.95`: `+2`
    * Else: `-1`
    * If `CNN > 0.97`: `+2`
  * If facing forward:
    * If `EAR < 0.16`: `+2`
    * Elif `EAR < 0.20`: `+1`
    * Else: `-1`
    * If `CNN > 0.90`: `+5`
    * Elif `CNN > 0.60`: `+2`
  * If looking down (`pitch > 18°`): `+2`
  * If no face detected: `score = max(0, score - 1)`
* **Alert States**:
  * Score `< 7`: Green text (`Normal`)
  * Score `7 - 11`: Yellow text (`Warning`)
  * Score `>= 12`: Accumulates duration counter `alert_duration`:
    * If `alert_duration >= 2.0s` (or `0.8s` if `CNN > 0.95`): Triggers Red text `ALERT: DROWSY`.
    * Fires `winsound.Beep(1200, 150)` with dynamic cooldown (0.2s - 1.0s depending on score).
  * Reset: If `EAR > 0.22` and `CNN < 0.60`, duration counter resets to `None`.

---

## 4. Reusability Assessment

### Reusable Ideas
* **Combined Geometric + Temporal Metric**: Blending geometric landmarks (EAR, head pose angles) with temporal windowing avoids single-frame false triggers.
* **Head Pose Gaze Conditioning**: Using yaw/pitch angles to prevent treating a normal mirror check or head turn as immediate eye closure.
* **Keypoint Topology**: 6-point head pose keypoints (nose tip, chin, eye corners, mouth corners) are computationally lightweight and effective for solvePnP.

### What Must NOT Be Reused
* **The `drowsiness_mobilenetv2.keras` Model File**:
  * Heavy (11.7 MB), runs synchronously per frame on CPU, causing severe framerate drops.
  * Proprietary training on undisclosed datasets with uncertain license and bias.
  * Overfits on eye crops and creates unpredictable inference latency.
* **Arbitrary Point Scoring Logic**:
  * Hardcoded magic numbers (`+5`, `+2`, `-1`, thresholds `0.90`, `0.95`, `0.97`, `0.60`, `0.20`, `0.16`, `0.22`, `18`, `25`, `12`, `15`) have no empirical or mathematical calibration.
  * Violates DriveGuard Rule 4 (Zero Magic Numbers).
* **Direct Script Code**:
  * Monolithic procedural script without functions, classes, configuration, or unit tests.

---

## 5. Architectural & Implementation Weaknesses

1. **Hardcoded Machine Paths**: Absolute paths (`D:\FINAL PRJ\drowsiness_mobilenetv2.keras`, `D:\FINAL PRJ\dataset_split_balanced`) crash immediately on any other workstation.
2. **Platform Incompatibility**: `winsound` is Windows-only; code crashes on Linux, macOS, or in web container environments.
3. **Deprecated MediaPipe Solutions API**: Uses `mp.solutions.face_mesh`, which is deprecated and removed in modern MediaPipe releases (MediaPipe >= 1.0 / Python 3.12).
4. **Synchronous Inference Bottleneck**: Cropping both eyes, converting to RGB, preprocessing, and executing two full MobileNetV2 forwards on CPU per frame throttles frame rates to <10 FPS on standard CPUs.
5. **No Decoupling / Untestable**: Entire capture, detection, neural net inference, sound trigger, and display are packed in a single `while True:` loop. Cannot be unit-tested without camera hardware.
6. **No Web Capabilities**: Standard desktop OpenCV `cv2.imshow` window only. Zero web server, WebSocket, or browser streaming architecture.

---

## 6. Risks & Compliance Analysis

1. **Licensing Risk (CRITICAL)**:
   * The repository has **NO license grant**. Under copyright law, the author retains all rights.
   * **Mitigation**: Do not copy or distribute any code, model weights, or image artifacts from `/legacy`. DriveGuard is written from scratch with clean-room pure functions and MediaPipe Tasks.
2. **Medical & Legal Overclaim Risk (CRITICAL)**:
   * The legacy script claims `ALERT: DROWSY`.
   * **Mitigation**: DriveGuard Rule 1 strictly prohibits claiming "drowsy" or "unsafe". All DriveGuard notifications are strictly advisory with neutral causal observations ("prolonged eye closure", "sustained head deviation").
3. **Safety / False Positive Risk**:
   * The arbitrary score increment/decrement system causes hysteresis and unpredictable alarm triggering under variable lighting, blinking patterns, or glasses wear.
   * **Mitigation**: DriveGuard uses pure scientific metrics (EAR and time-weighted PERCLOS over calibrated sliding windows) configured exclusively through `config.yaml`.
