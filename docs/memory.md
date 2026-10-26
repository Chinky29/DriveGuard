# DriveGuard: Project Memory & Execution Log

## 1. Project Context
- **Role**: Lead Engineer, DriveGuard
- **Project**: Real-time driver-state monitoring web app prototype in Python
- **Active Phase**: Phase 1 Complete (Tasks 1–5: Camera Ingestion, MediaPipe Landmarks, Pure Features & Temporal Metrics; Awaiting approval for Phase 2)

---

## 2. Current Status
- **Audit & Requirements**: Legacy audit complete (`docs/legacy-audit.md`); requirements synchronized (`docs/requirements.md`).
- **Rules & Governance**: Engineering rules established (`docs/rules.md`).
- **Phase 0 (Tooling & Skeleton)**: Complete. Next.js 14 App Router, TypeScript strict mode, Tailwind CSS, ESLint, Prettier, and Vitest verified.
- **Phase 1 Tasks 1–3 Status**: Complete. `CameraView.tsx`, `landmarks.ts`, landmark debug overlay, and `/monitor` test route verified.
- **Phase 1 Tasks 4–5 Status**: Complete and operational:
  - **Task 4 (`lib/detection/features.ts`)**: Pure TypeScript functions (no React, no DOM) for `computeEAR` (per eye and mean via FaceMesh indices), `computeMAR` (mouth aspect ratio via mouth landmarks), and `computeHeadPose` (pitch, yaw, roll from 4x4 transformation matrix).
  - **Task 5 (`lib/detection/perclos.ts`)**: Pure sliding-window PERCLOS (60s), blink detection (closure 100–400 ms), blink rate per minute, microsleep detection (closure >= 1.0 s), yawn counter (MAR >= 0.55 sustained for >= 1.5 s), and head nod detector (pitch <= -12° sustained for >= 0.8 s). Includes strict Rule 2 reset when face tracking is lost or confidence drops.
  - **Configuration Schema (`lib/detection/config.ts`)**: Updated with zero-magic-number typed schemas for `MarConfig`, `BlinkConfig`, `NodConfig`, and mouth landmarks.
  - **Unit Test Coverage**: Created `tests/unit/features.test.ts` and `tests/unit/perclos.test.ts` covering synthetic landmark arrays and timelines for open eyes, normal blink, long closure (microsleep), yawn, nod, and missing face. 35/35 tests passing.
  - **Live Debug Panel**: Wired raw real-time telemetry into `/monitor` displaying live EAR (mean, left, right), MAR (yawn count), Pitch (yaw, roll, nod count), 60s PERCLOS (blink count, rate/min), and reliability state.
  - **Quality Gates**: `npm run typecheck` (0 errors), `npm run lint` (0 errors), `npm test` (35 tests pass).
  - Paused and awaiting lead approval before executing Phase 2.

---

## 3. Progress Log

| Timestamp | Activity | Outcome |
| :--- | :--- | :--- |
| **2026-10-23 23:40** | Environment & Dependency Inspection | Python 3.12 verified. Confirmed MediaPipe Tasks `FaceLandmarker` is required (legacy `solutions.face_mesh` removed). |
| **2026-10-23 23:45** | Legacy Codebase Audit (`/legacy`) | Audited `realtime_drowsiness.py`, `train_drowsiness.py`, model file `drowsiness_mobilenetv2.keras`, and git commit history. |
| **2026-10-23 23:55** | Documentation Generation | Created `docs/legacy-audit.md`, `docs/rules.md`, `docs/requirements.md`, `docs/architecture.md`, `docs/phases.md`, and `docs/design.md`. |
| **2026-10-23 23:59** | Memory Consolidation | Updated `docs/memory.md` with resolved questions and current baseline status. |
| **2026-10-24 01:30** | Phase 0 Execution (Next.js App Router) | Initialized Next.js App Router, TypeScript strict mode, Tailwind CSS, ESLint, Prettier, and Vitest without disturbing `/docs` and `/legacy`. |
| **2026-10-24 01:38** | Verification of Phase 0 Deliverables | Verified `npm run typecheck` (0 errors), `npm run lint` (0 errors), `npm test` (14/14 tests passing), `npm run build` (success), `npm run dev` (serving 200 OK on localhost:3000). |
| **2026-10-25 03:10** | Phase 0 UI Logic Removal | Stripped premature UI logic, hardcoded telemetry numbers, status banners, and fake camera badges. Replaced page with a neutral placeholder. |
| **2026-10-26 17:45** | Phase 1 Tasks 1–3 Execution | Built `CameraView.tsx`, `lib/detection/landmarks.ts` (GPU/CPU fallback, 18 FPS throttled loop, tab-pause, transformation matrices), landmark debug overlay toggle, live FPS counter, and `/monitor` test page. |
| **2026-10-26 18:30** | Phase 1 Tasks 4–5 Execution | Implemented pure `features.ts` (EAR, MAR, HeadPose) and `perclos.ts` (60s PERCLOS, blinks 100-400ms, rate/min, microsleep >1.0s, yawns, nods). 35/35 unit tests pass. Wired live raw metrics debug panel to `/monitor`. |

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
