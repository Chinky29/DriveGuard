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

---

## 3. Web Application Architecture (Next.js Edge Pipeline)

The DriveGuard web application is built on Next.js (App Router, TypeScript, Tailwind CSS) providing client-side local frame processing with zero server-side image persistence:

```text
[ Browser Webcam Stream ]
         │  HTML5 Video Element (Local in-memory canvas)
         ▼
[ MediaPipe Vision Tasks ] (Client-side WebAssembly / GPU)
         │  Face Landmarks (468+ points) + Reliability Verification
         ▼
[ lib/detection Engine ]
         ├── ear.ts (Pure Eye Aspect Ratio)
         ├── perclos.ts (Rolling interval integration)
         ├── headpose.ts (Perspective-n-Point / Euler angles)
         └── fusion.ts (Temporal state machine)
         │
         ▼
[ Presentation & Auditing ]
         ├── components/camera/PrivacyBadge.tsx (Permanent local badge)
         ├── components/alerts/AdvisoryBanner.tsx (Graded status pill)
         ├── components/hud/TelemetryCard.tsx (Real-time metrics)
         ├── components/hud/CanvasOverlay.tsx (3D pose axes & eye landmarks)
         ├── lib/audio/chimes.ts (Web Audio API advisory tones)
         └── lib/logging/auditLogger.ts (Client session CSV telemetry export)
```

---

## 4. Next.js Application Directory Layout

```text
DriveGuard/
├── app/                                 # Next.js App Router
│   ├── api/                             # Internal backend routes
│   │   ├── audit/
│   │   │   └── route.ts                 # Session telemetry audit export
│   │   └── health/
│   │       └── route.ts                 # Healthcheck endpoint
│   ├── favicon.ico                      # Cockpit favicon
│   ├── globals.css                      # Global styles & Tailwind directives
│   ├── layout.tsx                       # Root layout (fonts, dark theme, metadata)
│   └── page.tsx                         # Main cockpit monitoring dashboard
├── components/                          # React components
│   ├── alerts/
│   │   └── AdvisoryBanner.tsx           # Floating advisory state banner
│   ├── camera/
│   │   ├── CameraFeed.tsx               # Webcam video & canvas integration
│   │   └── PrivacyBadge.tsx             # Persistent local-processing badge
│   ├── cockpit/
│   │   └── CockpitDashboard.tsx         # Full cockpit view container
│   ├── hud/
│   │   ├── CanvasOverlay.tsx            # High-contrast HUD & 3D axes overlay
│   │   └── TelemetryCard.tsx            # Real-time metrics readouts (EAR/PERCLOS/Pose)
│   └── ui/
│       ├── Button.tsx                   # Reusable button with glassmorphic styles
│       └── Card.tsx                     # Reusable glassmorphic card container
├── docs/                                # Project documentation suite
│   ├── architecture.md
│   ├── design.md
│   ├── legacy-audit.md
│   ├── memory.md
│   ├── phases.md
│   ├── requirements.md
│   └── rules.md
├── legacy/                              # Reference legacy repository (read-only)
├── lib/                                 # Core libraries and detection logic
│   ├── audio/
│   │   └── chimes.ts                    # Web Audio API pure tone generator
│   ├── detection/
│   │   ├── config.ts                    # Calibrated thresholds, windows & indices
│   │   ├── ear.ts                       # Pure EAR calculation
│   │   ├── fusion.ts                    # Multi-modal temporal fusion engine
│   │   ├── headpose.ts                  # Pure head pose estimation & Euler angles
│   │   ├── mediapipe.ts                 # MediaPipe FaceLandmarker WebAssembly loader
│   │   └── perclos.ts                   # Pure PERCLOS sliding window integration
│   ├── logging/
│   │   └── auditLogger.ts               # Local session event logger (CSV)
│   └── types/
│       └── index.ts                     # TypeScript interfaces & enums
├── public/                              # Static public assets
├── tests/                               # Test suite
│   └── unit/
│       ├── config.test.ts               # Configuration schema validation tests
│       ├── ear.test.ts                  # Pure EAR calculation tests
│       └── fusion.test.ts               # Temporal fusion state transition tests
├── .env.example                         # Environment variable template
├── .gitignore                           # Git ignore rules (binaries, node_modules)
├── eslint.config.mjs                    # ESLint configuration
├── next.config.ts                       # Next.js configuration
├── package.json                         # Dependencies & npm scripts
├── postcss.config.mjs                   # PostCSS configuration for Tailwind
├── prettier.config.mjs                  # Prettier code formatting rules
├── README.md                            # Setup, running, testing & architecture
├── tailwind.config.ts                   # Tailwind CSS design system tokens
├── tsconfig.json                        # TypeScript strict mode configuration
└── vitest.config.ts                     # Vitest test runner configuration
```
