# DriveGuard: Phased Implementation Roadmap

---

## Pre-Phase: Architecture, Legacy Audit & Baseline Analysis (CURRENT)
- [x] Audit `/legacy` repository architecture, algorithms, and dependencies.
- [x] Document weaknesses, licensing risks, and non-reusable components in `docs/legacy-audit.md`.
- [x] Update requirements and alignment in `docs/requirements.md`.
- [x] Initialize memory and tracking in `docs/memory.md`.
- [ ] Review with lead engineer before Phase 0 initialization.

---

## Phase 0: Project Skeleton, Configuration & Smoke Testing (Next.js App Router & Tooling)
- [ ] Initialize Next.js (App Router, TypeScript, Tailwind CSS) project in repository root without disturbing `/docs` and `/legacy`.
- [ ] Enable TypeScript strict mode, ESLint, Prettier, and Vitest.
- [ ] Scaffold folder structure from `docs/architecture.md` Section 4 with initial component & lib skeletons.
- [ ] Implement `lib/detection/config.ts` with zero-magic-number calibrated thresholds, windows, and comments.
- [ ] Configure `.env.example`, `.gitignore` (ignoring `.env*`, `/legacy/**/*.h5` large binaries, `node_modules`), and comprehensive `README.md` skeleton.
- [ ] Add and verify npm scripts: `dev`, `build`, `lint`, `typecheck`, `test`.

---

## Phase 1: Video Capture & Landmark Detection
- [x] Resilient camera capture wrapper (`driveguard/capture.py`) with privacy guarantee.
- [x] MediaPipe Tasks FaceLandmarker integration (`driveguard/landmarks.py`).
- [x] Model bundle management (auto-download of `face_landmarker.task`).
- [x] Reliability guard (`is_reliable` validation on 468+ landmark count).

---

## Phase 2: Pure Mathematical Feature Extraction
- [x] Pure Ear Aspect Ratio calculation (`calculate_ear`) with zero-division handling.
- [x] Pure PERCLOS time-weighted integration (`calculate_perclos_from_intervals`).
- [x] Pure Head Pose estimation via `solvePnP` and Euler angle decomposition.
- [x] Pure trackers (`EyeStateTracker`, `HeadPoseTracker`) decoupled from camera hardware.
- [x] 100% test coverage for pure math functions.

---

## Phase 3: Temporal Fusion & Advisory Alert Engine
- [x] Multi-modal temporal fusion engine (`driveguard/fusion.py`).
- [x] Graded advisory states (`UNKNOWN`, `NORMAL`, `NOTICE`, `WARNING`).
- [x] Strict Rule 1 enforcement: Neutral advisory reasons only (`"prolonged eye closure"`, `"sustained head deviation"`).
- [x] Strict Rule 2 enforcement: No decision when face is lost (`"Face not reliably detected"`).
- [x] Hysteresis and cooldown control to prevent alert oscillation.

---

## Phase 4: HUD Presentation & Event Logging
- [x] High-contrast visual HUD renderer (`driveguard/alerts.py`).
- [x] Permanent Privacy Indicator badge (`CAMERA ACTIVE [LOCAL PROCESSING ONLY]`).
- [x] 3D coordinate axes projection from nose tip.
- [x] Event telemetry CSV logger (`driver_events.csv`).

---

## Phase 5: Web Application Interface & Packaging (Upcoming)
- [ ] Web application wrapper (FastAPI / WebSocket streaming backend).
- [ ] Responsive browser frontend for real-time driver state monitoring.
- [ ] End-to-end integration and packaging verification.
