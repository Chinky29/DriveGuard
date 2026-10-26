# DriveGuard

**Real-Time Driver-State Monitoring Cockpit**

DriveGuard is a privacy-first, edge-native web application designed to evaluate physiological driver alertness cues (eye closure, blink duration, PERCLOS, and 3D head pose orientation) entirely in the user's browser without persistent video capture or external server transmission.

---

## 1. Safety & Ethical Governance

DriveGuard strictly adheres to the engineering rules defined in [`docs/rules.md`](docs/rules.md):

1. **Neutral Advisory Phrasing (Rule 1)**: The system **never** claims a driver is "drowsy", "asleep", or "unsafe". All outputs are strictly advisory with observable physiological causes (e.g. `"prolonged eye closure"`, `"sustained head deviation"`, `"high eye closure proportion"`).
2. **Face Reliability Guard (Rule 2)**: When facial landmarks cannot be reliably verified (`< 468` landmarks detected, or severe occlusion), the system pauses state assessment, displaying `"Face not reliably detected"`.
3. **Privacy by Design (Rule 3)**: All video frames are processed locally in volatile memory. Raw images and video streams are **never** persisted to disk or sent to external servers. A persistent `"CAMERA ACTIVE [LOCAL PROCESSING ONLY]"` badge is displayed at all times.
4. **Zero Magic Numbers (Rule 4)**: All thresholds, landmark indices, and sliding window durations are externalized in [`lib/detection/config.ts`](lib/detection/config.ts) and [`config.yaml`](config.yaml).
5. **Pure Mathematical Testability (Rule 5)**: Geometry, EAR calculations, PERCLOS integrations, and head pose estimations are pure functions tested independently of camera hardware.
6. **Clean-Room Engineering (Rule 6)**: The `/legacy` directory is read-only reference. Zero code or unverified binaries are imported into DriveGuard.

---

## 2. Tech Stack

- **Framework**: Next.js 14+ (App Router, React 18, TypeScript Strict Mode)
- **Styling**: Tailwind CSS with custom glassmorphism design tokens (`docs/design.md`)
- **Computer Vision**: Client-side MediaPipe Tasks FaceLandmarker (WebAssembly / GPU accelerated)
- **Audio Feedback**: Web Audio API synthesized pure tonal advisory chimes
- **Testing & Quality**: Vitest, React Testing Library, ESLint, Prettier, TypeScript `tsc`

---

## 3. Project Structure

```text
DriveGuard/
├── app/                        # Next.js App Router (pages, layouts, API routes)
│   ├── api/                    # Internal backend routes (health, audit)
│   ├── globals.css             # Tailwind directives & design system tokens
│   ├── layout.tsx              # Root HTML layout with viewport & metadata
│   └── page.tsx                # Cockpit dashboard monitoring view
├── components/                 # React UI & HUD presentation components
│   ├── alerts/                 # AdvisoryBanner and alert badges
│   ├── camera/                 # CameraFeed and PrivacyBadge
│   ├── cockpit/                # CockpitDashboard container
│   ├── hud/                    # CanvasOverlay and TelemetryCard
│   └── ui/                     # Reusable glassmorphic UI elements
├── docs/                       # Project documentation & engineering specifications
│   ├── architecture.md         # Pipeline design & directory structure
│   ├── design.md               # Color palette & cockpit HUD specifications
│   ├── legacy-audit.md         # Technical analysis of legacy baseline
│   ├── memory.md               # Project state and execution logs
│   ├── phases.md               # Phase roadmap & milestone tracking
│   ├── requirements.md         # Requirements matrix & audit diff
│   └── rules.md                # Safety, privacy & architectural constraints
├── legacy/                     # Reference-only legacy repository
├── lib/                        # Detection engine & utilities
│   ├── audio/                  # Web Audio API chime generator
│   ├── detection/              # Pure EAR, PERCLOS, HeadPose, and Fusion logic
│   ├── logging/                # Session telemetry CSV exporter
│   └── types/                  # Typed interfaces & enums
├── tests/                      # Automated unit and integration tests
├── .env.example                # Environment variable configuration template
├── .gitignore                  # Git ignore rules
├── package.json                # Project dependencies and npm scripts
├── tailwind.config.ts          # Tailwind CSS design system configuration
├── tsconfig.json               # TypeScript strict configuration
└── vitest.config.ts            # Vitest test runner configuration
```

---

## 4. Setup & Installation

### Prerequisites
- **Node.js**: v18.17+ or v20+ / v22+ (verified on Node v23)
- **npm**: v9+ (or pnpm / yarn)
- Modern web browser with WebRTC and WebAssembly support (Chrome, Edge, Firefox, Safari)

### Quick Start
```bash
# Clone the repository
git clone https://github.com/Chinky29/DriveGuard.git
cd DriveGuard

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local
```

---

## 5. Available Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts local Next.js development server at `http://localhost:3000` |
| `npm run build` | Compiles production Next.js build bundle |
| `npm run start` | Starts Next.js production server |
| `npm run lint` | Runs ESLint analysis across TypeScript & React codebase |
| `npm run typecheck` | Validates TypeScript types under `strict: true` via `tsc --noEmit` |
| `npm test` | Runs unit tests via Vitest in single-run mode |

---

## 6. Known Limitations & Operational Boundaries

1. **Extreme Head Poses & Occlusion**: MediaPipe FaceLandmarker requires key facial anchor points. If yaw exceeds ±45° or the face is partially obscured by hands, hats, or masks, the system gracefully degrades to `UNKNOWN` (`"Face not reliably detected"`).
2. **Low-Light Scenarios**: Standard webcams without infrared illumination exhibit high sensor noise in dim conditions, reducing landmark confidence.
3. **Spectacle Reflections**: Heavy glare or thick eyeglass frames can distort eye landmark coordinates, potentially lowering calculated EAR. Calibration against personal baselines is recommended.
4. **Advisory Prototype Only**: DriveGuard is not certified under automotive functional safety standards (ISO 26262) and should not be used as an autonomous collision avoidance or primary safety override.
