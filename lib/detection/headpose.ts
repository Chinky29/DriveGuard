import { HeadPoseEulerAngles } from "@/lib/types";

/**
 * Head Pose Evaluation & Geometry
 *
 * Implements Rule 5 (Pure Mathematical Functions):
 * Evaluates head deviation from Euler angles (Yaw and Pitch).
 */

export interface HeadDeviationResult {
  readonly isDeviated: boolean;
  readonly reason: "nominal" | "yaw_deviation" | "pitch_deviation" | "combined_deviation";
}

/**
 * Evaluates whether head pose exceeds configured thresholds.
 */
export function isHeadDeviated(
  angles: HeadPoseEulerAngles,
  yawThreshold: number,
  pitchThreshold: number
): HeadDeviationResult {
  const yawExceeded = Math.abs(angles.yaw) > yawThreshold;
  const pitchExceeded = Math.abs(angles.pitch) > pitchThreshold;

  if (yawExceeded && pitchExceeded) {
    return { isDeviated: true, reason: "combined_deviation" };
  }
  if (yawExceeded) {
    return { isDeviated: true, reason: "yaw_deviation" };
  }
  if (pitchExceeded) {
    return { isDeviated: true, reason: "pitch_deviation" };
  }
  return { isDeviated: false, reason: "nominal" };
}
