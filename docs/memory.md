# DriveGuard: Project Memory & Execution Log

## 1. Project Context
- **Role**: Lead Engineer, DriveGuard
- **Project**: Real-time driver-state monitoring web app prototype in Python
- **Active Phase**: Phase 3 Tasks 1–2 Complete (Flask ML Microservice in `/services/python` with `/predict-emotion`, `/predict-eye`, `/health`, Dockerfile, training script/notebook; Next.js Enhanced Mode toggle in Settings with explicit Rule 3 consent modal; 2.0s non-blocking crop dispatch and weak signal fusion; Supabase environment keys loaded; Next.js dev server live on port 3000)

---

## 2. Current Status
- **Audit & Requirements**: Legacy audit complete (`docs/legacy-audit.md`); requirements synchronized (`docs/requirements.md`).
- **Rules & Governance**: Engineering rules established (`docs/rules.md`).
- **Phase 0 (Tooling & Skeleton)**: Complete. Next.js 14 App Router, TypeScript strict mode, Tailwind CSS, ESLint, Prettier, and Vitest verified.
- **Phase 1 Tasks 1–10 Status**: Complete. Ingestion, MediaPipe landmarks, pure features, temporal PERCLOS, calibration, fatigue engine, alert manager, real cockpit monitor page, and session summary.
- **Phase 2 Tasks 1–7 Status**: Complete. Clerk auth, Supabase migration & RLS schema, client/server SDKs, calibration persistence, Zod API routes, non-blocking telemetry uploader, history/detail pages, settings page, and public landing page.
- **Phase 3 Tasks 1–2 Status**: Complete:
  - **Flask Microservice (`/services/python`)**: `app.py` on port 5001 exposing `GET /health`, `POST /predict-emotion` (DeepFace with fallback), and `POST /predict-eye` (`LightweightEyeCNN`, ~45k params, sub-millisecond CPU latency, reproducible training script `train_eye_cnn.py` and notebook `train_eye_cnn.ipynb`, `requirements.txt`, `Dockerfile`, `README.md`). Clean-room compliance: zero unlicenced code copied from `/legacy`.
  - **Enhanced Mode Next.js Integration**: Settings toggle in `app/settings/page.tsx` with explicit consent modal explaining Rule 3 volatile memory guarantees; proxy API `POST /api/enhanced/predict` enforcing 1.5s timeout with graceful fallback; `lib/detection/enhancedService.ts` (`EnhancedMLClient`) rate-limited to 2.0s thumbnail evaluation and weak signal merging (`mergeEnhancedSignal`, max 8% score impact); `CameraView.tsx` offscreen thumbnail extraction; real-time Cockpit HUD indicator.
  - **Quality Gates**: `npm run typecheck` (0 errors), `npm run lint` (0 warnings, 0 errors), `npm test` (75/75 tests passing across 10 test suites). Next.js dev server live on `http://localhost:3000` (HTTP 200 on all routes).

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
| **2026-10-26 21:55** | Phase 1 Tasks 6–10 Execution | Built `calibration.ts` + `CalibrationModal.tsx`, `fatigue.ts` (0-100 score with hysteresis), `alerts.ts` (Web Audio/vibrate/anti-spam/face lost timeout), real Monitor page (`ScoreGauge`, `MetricTileRow`, `AlertBanner`, `CriticalOverlay`, 10m sparkline, `SessionSummary` with Recharts, `FooterDisclaimer`). 53/53 tests pass. |
| **2026-10-26 22:30** | Phase 2 Tasks 1–3 Execution | Implemented Clerk Auth (`middleware.ts`, `app/sign-in`, `app/sign-up`, layout provider), Supabase migration schema with RLS (`supabase/migrations/20261026000000_init_schema.sql`), client/server Supabase SDKs, calibration persistence (`lib/supabase/calibration.ts`), updated `.env.example`, created `docs/clerk-supabase-integration.md`. 53/53 tests pass, 0 type errors, 0 lint errors. |
| **2026-10-26 22:50** | Phase 2 Tasks 4–7 Execution | Built Zod API routes (`POST /api/sessions`, `PATCH`, `DELETE`, `POST /api/events`, `POST /api/telemetry`, `GET /api/sessions`, `GET /api/sessions/[id]/export`, `DELETE /api/user/data`), non-blocking client uploader (`lib/telemetry/uploader.ts`), history & session detail pages (`app/history/page.tsx`, `app/history/[id]/page.tsx`), settings page (`app/settings/page.tsx`), consent modal (`components/privacy/ConsentModal.tsx`), export formatter (`lib/api/export.ts`). 75/75 tests pass across 10 suites, 0 type errors, 0 lint errors. |
| **2026-10-26 23:05** | Public Landing Page Execution | Built public landing page (`app/page.tsx`) with hero, interactive `CockpitPreview` placeholder, 3 feature cards, 3-step how-it-works, privacy note, and disclaimer footer. Verified HTTP 200 server response, responsive dark/light theme, `npm run build` success, and 75/75 passing tests. |
| **2026-10-27 00:30** | Phase 3 Tasks 1–2 Execution | Implemented Flask ML microservice (`/services/python`) with `/predict-emotion`, `/predict-eye`, `/health`, Dockerfile, training script/notebook. Built Next.js Enhanced Mode toggle with explicit consent modal, 2.0s thumbnail evaluation proxy, and weak signal merger. Wired into CameraView. Loaded user Supabase keys into `.env.local`. Started Next.js dev server on port 3000 (all routes 200 OK) and Flask service on port 5001. All 75 tests passing. |

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
