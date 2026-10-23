# DriveGuard: Project Memory & Execution Log

## 1. Project Context
- **Role**: Lead Engineer, DriveGuard
- **Project**: Real-time driver-state monitoring web app prototype in Python
- **Active Phase**: Legacy Audit & Requirements Realignment (Analysis Complete; Phase 0 ready)

---

## 2. Current Status
- **Audit**: Completed full technical and risk audit of `/legacy` repository; documented findings in `docs/legacy-audit.md`.
- **Requirements**: Updated `docs/requirements.md` Existing Features matrix to match verified reality.
- **Rules & Governance**: Established `docs/rules.md` (neutral advisory phrasing, reliability guards, privacy by design, zero magic numbers).
- **Architecture & Design**: Documented system architecture (`docs/architecture.md`), design system (`docs/design.md`), and roadmap (`docs/phases.md`).
- **Phase 0 Status**: Complete and verified, holding for lead approval before web application development.

---

## 3. Progress Log

| Timestamp | Activity | Outcome |
| :--- | :--- | :--- |
| **2026-10-23 23:40** | Environment & Dependency Inspection | Python 3.12 verified. Confirmed MediaPipe Tasks `FaceLandmarker` is required (legacy `solutions.face_mesh` removed). |
| **2026-10-23 23:45** | Legacy Codebase Audit (`/legacy`) | Audited `realtime_drowsiness.py`, `train_drowsiness.py`, model file `drowsiness_mobilenetv2.keras`, and git commit history. |
| **2026-10-23 23:55** | Documentation Generation | Created `docs/legacy-audit.md`, `docs/rules.md`, `docs/requirements.md`, `docs/architecture.md`, `docs/phases.md`, and `docs/design.md`. |
| **2026-10-23 23:59** | Memory Consolidation | Updated `docs/memory.md` with resolved questions and current baseline status. |

---

## 4. Open Questions Answered

### Q1: What detection method does the legacy repository use?
**Answer**: It uses a hybrid approach:
1. MediaPipe FaceMesh (legacy API) for facial landmarks.
2. 6-point Eye Aspect Ratio (EAR) calculation.
3. MobileNetV2 CNN transfer learning classifier (`drowsiness_mobilenetv2.keras`) running synchronously on cropped 224x224 eye regions.
4. 6-point `solvePnP` head pose estimation (Pitch, Yaw, Roll via `RQDecomp3x3`).

### Q2: What are the legacy thresholds and scoring mechanics?
**Answer**:
- EAR thresholds: Low = `0.20`, Very Low = `0.16`, Reset = `0.22`.
- CNN thresholds: Drowsy = `0.90`, Strong Drowsy = `0.95`.
- Head pose thresholds: Yaw = `25°`, Pitch = `18°`.
- Scoring: Points accumulate (up to `15`), triggering `ALERT: DROWSY` when score `>= 12` and alert duration exceeds `2.0s` (or `0.8s` for strong CNN).

### Q3: Can any part of `/legacy` be copied into DriveGuard?
**Answer**: **No.**
1. **License**: The repository contains **NO license file**. Under copyright law, all rights are reserved by the original creator.
2. **Quality & Portability**: Contains hardcoded machine paths (`D:\FINAL PRJ\...`), Windows-only `winsound`, and procedural global code without tests.
3. **Safety / Ethics**: Emits uncalibrated `"ALERT: DROWSY"` claims which directly violates DriveGuard Rule 1.
4. **Performance**: Running dual MobileNetV2 crops synchronously on CPU causes extreme framerate degradation.

### Q4: How is DriveGuard's architecture superior?
**Answer**:
1. **Clean-room modular package** (`driveguard/`) with pure, camera-independent math functions for EAR, PERCLOS, and pose.
2. **Zero magic numbers**: All parameters, thresholds, and windows are externalized in `config.yaml`.
3. **Modern MediaPipe Tasks API**: Fully compatible with Python 3.12.
4. **Strict Safety Compliance**: Neutral advisory observations only (`"prolonged eye closure"`, `"sustained head deviation"`).
5. **Reliability Guard**: Immediately pauses decisions and displays `"Face not reliably detected"` when tracking confidence drops.
