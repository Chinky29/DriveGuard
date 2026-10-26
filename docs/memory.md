# DriveGuard: Project Memory & Execution Log

## 1. Project Context
- **Role**: Lead Engineer, DriveGuard
- **Project**: Real-time driver-state monitoring web app prototype in Python
- **Active Phase**: Phase 2 Complete (Tasks 1–7: Clerk Auth, Supabase RLS, API Routes with Zod, Non-blocking Client Uploader, History & Session Detail Pages, Settings with Delete-My-Data, Privacy Consent Modal, and Export Formatter; 75/75 Vitest tests pass)

---

## 2. Current Status
- **Audit & Requirements**: Legacy audit complete (`docs/legacy-audit.md`); requirements synchronized (`docs/requirements.md`).
- **Rules & Governance**: Engineering rules established (`docs/rules.md`).
- **Phase 0 (Tooling & Skeleton)**: Complete. Next.js 14 App Router, TypeScript strict mode, Tailwind CSS, ESLint, Prettier, and Vitest verified.
- **Phase 1 Tasks 1–5 Status**: Complete. Ingestion, MediaPipe landmarks, pure `features.ts`, and `perclos.ts` operational.
- **Phase 1 Tasks 6–8 Status**: Complete:
  - **Calibration (`lib/detection/calibration.ts` + `CalibrationModal.tsx`)**: 20-second session, MAD median-based outlier rejection, personalized EAR/MAR baseline and thresholds, retry option, and defaults fallback when skipped.
  - **Fused Fatigue Engine (`lib/detection/fatigue.ts`)**: Multi-modal score (0–100) combining PERCLOS, blink duration, yawn rate, nodding, and microsleep via typed config weights; temporal hysteresis with sustained escalation ($\ge 1.5$s) and recovery de-escalation ($\ge 3.0$s); neutral physiological reasons array.
  - **Alert Manager (`lib/detection/alerts.ts`)**: Notice, Warning, and Critical alert levels, Web Audio API chimes with user-gesture unlock, navigator.vibrate haptics, anti-spam cooldowns per level with escalation bypass, and "face not visible" non-alarm state that escalates only after a 5.0s timeout.
- **Phase 1 Tasks 9–10 Status**: Complete:
  - **Real Monitor Page (`app/monitor/page.tsx`)**: Cockpit layout per `design.md` section 4.3 and tokens in section 2. `ScoreGauge`, `MetricTileRow`, `AlertBanner`, `CriticalOverlay`, 10-minute sparkline trend, session timer, pause/resume, recalibration, theme toggle, and hidden debug toggle (`D` key).
  - **Session Summary (`components/monitor/SessionSummary.tsx`)**: Summary view with duration, avg/peak scores, alert counts, Recharts timeline chart, event log, CSV export.
  - **Footer Disclaimer (`components/monitor/FooterDisclaimer.tsx`)**: Section 10 mandatory safety/medical disclaimer.
- **Phase 2 Tasks 1–3 Status**: Complete:
  - **Clerk Authentication**: Installed `@clerk/nextjs` (v5.7.5); implemented `middleware.ts` protecting `/monitor`, `/history`, and `/settings` while keeping `/` public; wrapped root layout with `<ClerkProvider>` styled to match cockpit dark tokens; built `/sign-in` and `/sign-up` catch-all pages.
  - **Supabase Migration & RLS**: SQL migration (`supabase/migrations/20261026000000_init_schema.sql`) declaring tables `profiles`, `calibrations`, `sessions`, `metric_points`, and `events`; enabled RLS on every table using `requesting_user_id()` function extracting `sub` claim from JWT; documented integration in `docs/clerk-supabase-integration.md`.
  - **Client & Server Supabase SDKs**: Created `lib/supabase/client.ts` injecting Clerk user JWT into headers without exposing service role key; created `lib/supabase/server.ts` with strict client runtime isolation throw.
  - **Calibration Persistence**: Created `lib/supabase/calibration.ts` (`saveUserCalibration`, `loadUserCalibration`) and wired automatically into `app/monitor/page.tsx` on sign-in and calibration completion/skip.
- **Phase 2 Tasks 4–7 Status**: Complete:
  - **API Routes with Zod Validation**: Built `POST /api/sessions`, `PATCH /api/sessions/[id]`, `DELETE /api/sessions/[id]`, `POST /api/events` (batched), `POST /api/telemetry` (batched metric points), `GET /api/sessions`, `GET /api/sessions/[id]`, `GET /api/sessions/[id]/export?format=csv|json`, and `DELETE /api/user/data` (GDPR delete-my-data). All payloads validated with Zod and authorized to the authenticated Clerk user.
  - **Export Formatter (`lib/api/export.ts`)**: Pure RFC 4180 CSV and structured JSON serializer for session telemetry and events with field escaping and metadata headers.
  - **Non-blocking Client Uploader (`lib/telemetry/uploader.ts`)**: Batches metric points every 5 seconds, queues asynchronously without blocking the MediaPipe detection loop, and automatically buffers and retries when offline.
  - **History & Session Detail Pages**: Built `app/history/page.tsx` and `app/history/[id]/page.tsx` with loading skeletons, empty state, error state, Recharts timeline chart, physiological events table, and direct CSV/JSON download exports.
  - **Settings Page (`app/settings/page.tsx`)**: Sensitivity selector (Low/Balanced/High), audio chime toggle with volume slider, vibration toggle with support detection, language dropdown, dark/light theme toggle, recalibrate shortcut, and double-confirmed "Delete All My Data" GDPR purge.
  - **Privacy Consent Modal (`components/privacy/ConsentModal.tsx`)**: Explains Rule 3 local edge processing guarantee (numerical telemetry only, zero video frames recorded).
  - **Public Landing Page (`app/page.tsx` + `components/landing/CockpitPreview.tsx`)**: Built per `docs/design.md` section 4.1 and `docs/rules.md`. Features hero headline and tagline, interactive product screenshot/mockup component with live Nominal vs Notice state toggle, 3 feature cards (Fused Score, Private by Design, Trip Insights), 3-step How-It-Works section, Privacy Note card, and mandatory Section 10 safety/medical disclaimer footer. Zero fake statistics or testimonials. High contrast, fully responsive, accessible, dark/light theme support.
  - **Quality Gates**: `npm run build` (success, 13 routes generated), `npm run typecheck` (0 errors), `npm run lint` (0 warnings, 0 errors), `npm test` (75/75 tests pass across 10 test suites).

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
