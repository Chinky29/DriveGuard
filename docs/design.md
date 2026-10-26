# DriveGuard: Design & Visual Identity Specification

## 1. Visual Design Principles
DriveGuard's user interface is designed for real-time vehicular and monitoring contexts where readability, cognitive simplicity, and immediate clarity are paramount.

- **High Contrast**: Dark background theme (`#161616`) with distinct accent indicators.
- **Cognitive Clarity**: No ambiguous status codes; clean state colors and human-readable observations.
- **Privacy Transparency**: Unmistakable camera activity indicator visible in every frame.

---

## 2. Color Palette

| Token | Hex / BGR | Usage |
| :--- | :--- | :--- |
| `COLOR_BG` | `#161616` / `(22, 22, 22)` | HUD panels, badge backgrounds, pill backdrops |
| `COLOR_BORDER` | `#323232` / `(50, 50, 50)` | Card borders and divider rules |
| `COLOR_TEXT` | `#FFFFFF` / `(255, 255, 255)` | Primary telemetry values and banners |
| `COLOR_MUTED` | `#A0A0A0` / `(160, 160, 160)` | Subtitles, helper text, and inactive telemetry |
| `COLOR_INDICATOR` | `#00FF7F` / `(0, 255, 127)` | Privacy "Camera Active" status dot |
| `COLOR_NORMAL` | `#2ECC71` / `(46, 204, 113)` | Attentive status banner, nominal EAR indicator |
| `COLOR_NOTICE` | `#F1C40F` / `(241, 196, 15)` | Early advisory notice (Amber) |
| `COLOR_WARNING` | `#E74C3C` / `(231, 76, 60)` | Critical advisory alert (Crimson) |
| `COLOR_UNKNOWN` | `#7F8C8D` / `(127, 140, 141)` | Tracking paused / Face not detected (Slate) |

---

## 3. On-Screen Display (HUD) Layout

```text
┌────────────────────────────────────────────────────────────────────────┐
│ [● CAMERA ACTIVE - LOCAL PROCESSING]       [ ADVISORY STATUS ]        │
│                                                                        │
│                                                                        │
│                                (Face)                                  │
│                                ( 3D )                                  │
│                                (Axes)                                  │
│                                                                        │
│                                                                        │
│ ┌───────────────────────────┐                                          │
│ │ TELEMETRY   [30.0 FPS]    │                                          │
│ │ ───────────────────────── │                                          │
│ │ EAR: 0.320 (thr: 0.21)    │                                          │
│ │ Eye Closure: 0.00s        │                                          │
│ │ PERCLOS: 3.2% (win: 60s)  │                                          │
│ │ Yaw: +2.1° | Pitch: -1.4° │                                          │
│ │ Deviation: 0.00s          │                                          │
│ └───────────────────────────┘                                          │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 4. UI Components

1. **Privacy Badge (Top-Left)**:
   - Green pulsing dot with text: `"CAMERA ACTIVE [LOCAL PROCESSING ONLY]"`.
   - Reinforces local edge processing guarantee.
2. **Advisory Banner (Top-Center)**:
   - Dynamic pill indicating current fusion level:
     - Green: `ADVISORY STATUS: Attentive - Nominal`
     - Amber: `ADVISORY NOTICE: <reason> (<duration>s)`
     - Crimson: `ADVISORY ALERT: <REASON> (<duration>s)`
     - Slate Gray: `MONITORING PAUSED: Face not reliably detected`
3. **Telemetry Card (Bottom-Left)**:
   - Clean card with real-time frame rate, EAR threshold delta, PERCLOS rolling ratio, and head orientation angles.
4. **3D Pose Axes**:
   - Projected perspective lines anchored to the driver's nose tip:
     - **Red line**: X-axis (lateral turn)
     - **Green line**: Y-axis (vertical pitch)
     - **Blue line**: Z-axis (optical depth)
