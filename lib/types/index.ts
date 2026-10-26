/**
 * DriveGuard Core Type Definitions
 *
 * Enforces Rule 1 (Neutral Advisory Phrasing): Advisory levels and reasons
 * use strictly physiological and observable descriptions.
 */

export enum AdvisoryLevel {
  UNKNOWN = "UNKNOWN",
  NORMAL = "NORMAL",
  NOTICE = "NOTICE",
  WARNING = "WARNING",
}

export type AdvisoryReason =
  | "Face not reliably detected"
  | "Attentive - Nominal"
  | "prolonged eye closure"
  | "sustained head deviation"
  | "high eye closure proportion"
  | "sustained head deviation and eye closure";

export interface Point2D {
  readonly x: number;
  readonly y: number;
}

export interface Point3D {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface HeadPoseEulerAngles {
  readonly yaw: number; // Positive = right turn, Negative = left turn
  readonly pitch: number; // Positive = head up, Negative = head down
  readonly roll: number; // Positive = tilt right, Negative = tilt left
}

export interface DriverStateSnapshot {
  readonly timestamp: number;
  readonly faceReliable: boolean;
  readonly advisoryLevel: AdvisoryLevel;
  readonly advisoryReason: AdvisoryReason | string;
  readonly ear: number;
  readonly eyeClosureDuration: number;
  readonly perclos: number | null;
  readonly headPose: HeadPoseEulerAngles;
  readonly headDeviationDuration: number;
  readonly fps: number;
}

export interface AuditEvent {
  readonly id: string;
  readonly timestamp: string;
  readonly level: AdvisoryLevel;
  readonly reason: string;
  readonly durationSeconds: number;
  readonly peakEar: number;
  readonly finalPerclos: number | null;
  readonly peakYaw: number;
  readonly peakPitch: number;
}
