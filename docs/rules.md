# DriveGuard Engineering Rules & Constraints

These rules are mandatory for all contributors, agents, and subagents on the DriveGuard project.

---

## 1. Safety & Advisory Phrasing (Rule 1)
- **Never claim a driver is "drowsy", "asleep", or "unsafe"**.
- DriveGuard is an **advisory monitoring prototype**, not a certified medical or automotive safety device.
- All system outputs must use neutral, observable physiological descriptions:
  - `"prolonged eye closure"`
  - `"sustained head deviation"`
  - `"high eye closure proportion"`
  - `"sustained head deviation and eye closure"`
- State levels must be strictly graded:
  - `UNKNOWN`: Insufficient confidence or face not reliably tracked.
  - `NORMAL`: Attentive.
  - `NOTICE`: Mild/early duration threshold met.
  - `WARNING`: Elevated advisory duration threshold met.

---

## 2. Face Reliability Guard (Rule 2)
- If facial landmarks cannot be reliably detected (e.g. occlusion, extreme pose, low lighting, or `< 468` landmarks):
  - The UI must display **"Face not reliably detected"**.
  - The system must refuse to make any driver state assessment (`AdvisoryLevel.UNKNOWN`).
  - Eye closure and head deviation accumulators must be safely reset to prevent false alarms.

---

## 3. Privacy by Design (Rule 3)
- All video frame processing must occur **locally** on device memory.
- **Never save raw video frames or camera images to disk by default** (`save_raw_frames: false`).
- A persistent visual badge (`CAMERA ACTIVE [LOCAL PROCESSING ONLY]`) must be visible on the video feed at all times.
- Telemetry logging (CSV/database) may only record numerical metrics and timestamps, never image payloads.

---

## 4. Zero Magic Numbers (Rule 4)
- **No hardcoded thresholds, time windows, or landmark indices in source code**.
- All configuration values, weights, bounding thresholds, and keypoint mappings must reside in `config.yaml`.
- The application must load and validate configuration via typed schemas.

---

## 5. Pure Mathematical Functions & Testability (Rule 5)
- All geometric, kinematic, and temporal math functions (EAR, PERCLOS, solvePnP pose estimation, Euler angle decomposition, interval integration) must be pure functions.
- Pure functions must take numpy arrays / primitives and return numbers/tuples with zero camera or UI dependencies.
- Unit test coverage must verify these functions against synthetic data without requiring hardware access.

---

## 6. Legacy Reference Policy (Rule 6)
- The `/legacy` directory is **read-only and reference-only**.
- Do **not** modify `/legacy`.
- Do **not** copy code blindly from `/legacy`.
- Heavy, unverified legacy models and procedural logic must not contaminate the clean modular architecture.

---

## 7. Phased Execution & Deliverables (Rule 7)
- Follow the phased roadmap strictly:
  - Do not jump ahead into subsequent phases without completing the current phase.
  - Each phase must deliver verifiable code, unit tests, manual testing instructions, and documented assumptions.
- Dependency versions must be pinned in `requirements.txt`.
