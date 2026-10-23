# DriveGuard: Architecture Specification

## 1. System Architecture Overview

DriveGuard follows a decoupled, pipeline architecture designed for high throughput, local privacy, and testability.

```text
[ Video Ingestion ] (Webcam / Video File / Demo Fallback)
         │  BGR Frame + Timestamp
         ▼
[ Landmark Extraction ] (MediaPipe Tasks FaceLandmarker)
         │  468+ 3D Normalized & Pixel Coordinates + Reliability Flag
         ├─── Reliability == False ──► [ Advisory Engine: UNKNOWN ("Face not reliably detected") ]
         │
         ▼ Reliability == True
   ┌─────────────────────────────┴─────────────────────────────┐
   │                                                           │
   ▼                                                           ▼
[ Eye Metrics ]                                     [ Head Pose Estimation ]
- calculate_ear()                                   - build_camera_matrix()
- compute_both_eyes_ear()                           - estimate_head_pose() via solvePnP
- calculate_perclos_from_intervals()                - cv2.RQDecomp3x3 -> Yaw, Pitch, Roll
- EyeStateTracker (closure duration, perclos)       - HeadPoseTracker (sustained duration)
   │                                                           │
   └─────────────────────────────┬─────────────────────────────┘
                                 │
                                 ▼
                     [ Temporal Fusion Engine ]
                     - Evaluates continuous duration thresholds
                     - Applies cooldown / hysteresis
                     - Emits DriverStateSnapshot
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │  Presentation & Audit   │
                    ├─────────────────────────┤
                    │ - AlertOverlayRenderer  │
                    │ - Telemetry HUD & Axes  │
                    │ - EventLogger (CSV)     │
                    │ - Web/Display Window    │
                    └─────────────────────────┘
```

---

## 2. Component Design & Decoupling

1. **`driveguard.config`**: Typed dataclasses (`AppConfig`, `CameraConfig`, `EyeConfig`, etc.) loaded from `config.yaml`.
2. **`driveguard.capture`**: `FrameCapture` abstraction managing camera lifecycle, auto-fallback, and privacy enforcement.
3. **`driveguard.landmarks`**: `FaceLandmarkDetector` wrapping MediaPipe Tasks API with model bundle management and reliability validation.
4. **`driveguard.eye`**: Pure functions for EAR and interval PERCLOS + `EyeStateTracker`.
5. **`driveguard.headpose`**: Pure functions for camera matrix, solvePnP, Euler angle decomposition, 3D axis projection + `HeadPoseTracker`.
6. **`driveguard.fusion`**: State machine mapping multi-modal temporal metrics into strictly neutral advisory alerts.
7. **`driveguard.alerts`**: `AlertOverlayRenderer` drawing the HUD, privacy badge, and telemetry card.
8. **`driveguard.logging_utils`**: Structured logger and `EventLogger` recording telemetry and transitions without image storage.
