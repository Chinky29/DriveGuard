# DriveGuard: Product & Technical Requirements

## 1. Overview
DriveGuard is an edge-first, real-time driver-state monitoring web application prototype designed to evaluate driver alertness cues locally via webcam or video feeds without persistent video recording.

---

## 2. Existing Features Analysis (Legacy Baseline vs. Reality)

> **Audit Context**: Evaluated against the `/legacy` reference repository (`Driver-Drowsiness-detection-system`). Changes from initial expectations to verified reality are marked below.

### 2.1 Feature Audit & Reality Matrix

| Feature | Claimed / Expected | Verified Reality in `/legacy` | DriveGuard Target |
| :--- | :--- | :--- | :--- |
| **Face & Mesh Detection** | MediaPipe FaceMesh | Uses deprecated `mp.solutions.face_mesh` (incompatible with modern Python 3.12 / MediaPipe 1.0+) | **[CHANGED]** Must use modern `mediapipe.tasks.python.vision.FaceLandmarker` with automated model download |
| **Eye State Classification** | Deep MobileNetV2 CNN + EAR | Dual system: 6-point EAR + MobileNetV2 (`drowsiness_mobilenetv2.keras`) running synchronously on every frame for both eyes | **[CHANGED]** Eliminate heavy proprietary CNN for prototype baseline. Rely on pure calibrated EAR + standard time-weighted PERCLOS to maintain real-time FPS on CPU |
| **Head Pose Estimation** | Head-pose cues for side/downward gaze | 6-point `solvePnP` with `RQDecomp3x3` in OpenCV. Hardcoded thresholds (`yaw=25°`, `pitch=18°`) | **[CHANGED]** Standardize anthropometric 3D face model points, eliminate magic numbers into `config.yaml`, and provide 3D axis visualization |
| **Scoring & Alarm Logic** | Temporal scoring | Arbitrary point accumulation (`score += 5`, `+= 2`, `-1`, max 15) with hardcoded confirmation delay (2.0s / 0.8s) | **[CHANGED]** Replace ad-hoc points with calibrated temporal sliding window integration and graded levels (`NORMAL`, `NOTICE`, `WARNING`) |
| **Alert Phrasing** | Driver Alert | Emits uncalibrated `"ALERT: DROWSY"` text | **[CRITICAL CHANGE]** Strictly forbid `"drowsy"` and `"unsafe"`. Provide purely descriptive advisory causes: `"prolonged eye closure"`, `"sustained head deviation"` |
| **Audio Alerts** | Audio warning | Uses `winsound.Beep` | **[CHANGED]** `winsound` is Windows-only. Must use cross-platform audio or client-side web audio synthesis |
| **Application Interface** | Production prototype | Single procedural desktop script calling `cv2.imshow` | **[CHANGED]** Modular package layout, clean separation of concerns, and web/HUD presentation |
| **Licensing** | Open-source reference | **NO LICENSE FILE**. Copyright retained by author | **[CHANGED]** Clean-room implementation. Zero code or binary models copied from legacy |

---

## 3. DriveGuard Functional Requirements

### FR-1: Video Capture & Ingestion
- Ingest live frames from local webcams (`camera.device_id`).
- Support offline evaluation via video files (`camera.playback_file`).
- Graceful automated fallback to bundled synthetic/demo stream if no physical camera is detected.

### FR-2: Facial Landmark Tracking & Reliability Guard
- Detect 468+ 3D facial landmarks using MediaPipe Tasks API.
- **Reliability Guard**: If fewer than 468 landmarks are detected or tracking is lost, immediately output `UNKNOWN` with reason `"Face not reliably detected"`. Suppress false alarms and pause driver state decision.

### FR-3: Pure Eye Closure Metrics (EAR & PERCLOS)
- **Eye Aspect Ratio (EAR)**: Compute pure Soukupová & Čech metric for both eyes and mean EAR.
- **PERCLOS**: Maintain rolling sliding window (default: 60s) calculating time-weighted percentage of eye closure.
- **Closure Duration**: Accumulate continuous closure duration in seconds; reset immediately upon eye reopening.

### FR-4: Pure Head Pose Estimation
- Estimate Yaw (turn), Pitch (nod), and Roll (tilt) in degrees via `cv2.solvePnP` and `cv2.RQDecomp3x3`.
- Compute continuous sustained deviation duration when head pose exceeds configured thresholds.
- Project 3D coordinate axes from nose tip for visual confirmation.

### FR-5: Temporal Fusion & Advisory Decision Engine
- Fuse EAR closure duration, PERCLOS proportion, and head deviation duration over time.
- Categorize advisory states into:
  - `UNKNOWN`: Face tracking lost.
  - `NORMAL`: Attentive.
  - `NOTICE`: Early warning threshold met (e.g. eye closed >= 1.0s or head turned >= 1.5s).
  - `WARNING`: Critical advisory threshold met (e.g. eye closed >= 1.8s or head turned >= 2.5s).
- Apply debounce/cooldown to prevent rapid alert toggling.

### FR-6: Privacy & Data Protection
- Process all frames in local memory.
- Strictly disable disk persistence of raw video frames by default (`save_raw_frames: false`).
- Render permanent high-contrast badge: `CAMERA ACTIVE [LOCAL PROCESSING ONLY]`.

### FR-7: Master Configuration
- Externalize all thresholds, temporal windows, and landmark indices in `config.yaml`.
- Strictly zero magic numbers in code.

---

## 4. Non-Functional Requirements
- **Performance**: Maintain >= 25 FPS on modern quad-core CPU without dedicated GPU.
- **Testability**: Pure math modules testable via automated pytest suite with synthetic fixtures.
- **Portability**: Verified on Python 3.10 - 3.12 across Windows, Linux, and macOS.
