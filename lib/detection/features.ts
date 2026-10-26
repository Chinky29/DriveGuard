/**
 * DriveGuard Pure Feature Extraction Functions
 *
 * Implements Rule 5 (Pure Mathematical Functions & Testability):
 * - computeEAR: Eye Aspect Ratio per eye and averaged using MediaPipe FaceMesh landmark indices
 * - computeMAR: Mouth Aspect Ratio for yawn detection
 * - computeHeadPose: Euler angles (pitch, yaw, roll) from 4x4 facial transformation matrix
 *
 * Strictly zero React, zero DOM dependencies.
 */

import { DEFAULT_CONFIG, DriveGuardConfig } from "./config";

export interface LandmarkPoint {
  readonly x: number;
  readonly y: number;
  readonly z?: number;
}

export interface EarResult {
  readonly leftEAR: number;
  readonly rightEAR: number;
  readonly avgEAR: number;
  readonly valid: boolean;
}

export interface MarResult {
  readonly mar: number;
  readonly valid: boolean;
}

export interface HeadPoseResult {
  readonly pitch: number; // Positive = head up, Negative = head down (degrees)
  readonly yaw: number;   // Positive = turn right, Negative = turn left (degrees)
  readonly roll: number;  // Positive = tilt right, Negative = tilt left (degrees)
  readonly valid: boolean;
}

/**
 * Calculates 2D Euclidean distance between two landmark points.
 */
export function distance2D(p1: LandmarkPoint, p2: LandmarkPoint): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculates Eye Aspect Ratio (EAR) for a single eye given 6 landmark points.
 * Formula (Soukupová & Čech):
 * EAR = (||p2 - p6|| + ||p3 - p5||) / (2 * ||p1 - p4||)
 */
export function computeEyeEAR(
  landmarks: readonly LandmarkPoint[],
  indices: readonly [number, number, number, number, number, number]
): number {
  if (!landmarks || landmarks.length === 0) return 0.0;

  const [i1, i2, i3, i4, i5, i6] = indices;
  const p1 = landmarks[i1];
  const p2 = landmarks[i2];
  const p3 = landmarks[i3];
  const p4 = landmarks[i4];
  const p5 = landmarks[i5];
  const p6 = landmarks[i6];

  if (!p1 || !p2 || !p3 || !p4 || !p5 || !p6) {
    return 0.0;
  }

  const vertical1 = distance2D(p2, p6);
  const vertical2 = distance2D(p3, p5);
  const horizontal = distance2D(p1, p4);

  if (horizontal < 1e-6) {
    return 0.0;
  }

  return (vertical1 + vertical2) / (2.0 * horizontal);
}

/**
 * Computes Eye Aspect Ratio (EAR) for both eyes and their mean.
 * Handles missing landmarks or low landmark counts (< 468).
 */
export function computeEAR(
  landmarks: readonly LandmarkPoint[] | null | undefined,
  config: DriveGuardConfig = DEFAULT_CONFIG
): EarResult {
  if (!landmarks || landmarks.length < config.reliability.minLandmarksRequired) {
    return {
      leftEAR: 0.0,
      rightEAR: 0.0,
      avgEAR: 0.0,
      valid: false,
    };
  }

  const leftEAR = computeEyeEAR(landmarks, config.landmarks.leftEye);
  const rightEAR = computeEyeEAR(landmarks, config.landmarks.rightEye);
  const avgEAR = (leftEAR + rightEAR) / 2.0;

  return {
    leftEAR,
    rightEAR,
    avgEAR,
    valid: true,
  };
}

/**
 * Computes Mouth Aspect Ratio (MAR) using MediaPipe FaceMesh mouth landmark indices.
 * Formula:
 * MAR = (||upperInner - lowerInner|| + ||upperOuter - lowerOuter||) / (2 * ||leftCorner - rightCorner||)
 */
export function computeMAR(
  landmarks: readonly LandmarkPoint[] | null | undefined,
  config: DriveGuardConfig = DEFAULT_CONFIG
): MarResult {
  if (!landmarks || landmarks.length < config.reliability.minLandmarksRequired) {
    return {
      mar: 0.0,
      valid: false,
    };
  }

  const { mouth } = config.landmarks;
  const pLeft = landmarks[mouth.leftCorner];
  const pRight = landmarks[mouth.rightCorner];
  const pUpperInner = landmarks[mouth.upperInner];
  const pLowerInner = landmarks[mouth.lowerInner];
  const pUpperOuter = landmarks[mouth.upperOuter];
  const pLowerOuter = landmarks[mouth.lowerOuter];

  if (!pLeft || !pRight || !pUpperInner || !pLowerInner || !pUpperOuter || !pLowerOuter) {
    return {
      mar: 0.0,
      valid: false,
    };
  }

  const horizontal = distance2D(pLeft, pRight);
  if (horizontal < 1e-6) {
    return {
      mar: 0.0,
      valid: true,
    };
  }

  const verticalInner = distance2D(pUpperInner, pLowerInner);
  const verticalOuter = distance2D(pUpperOuter, pLowerOuter);
  const mar = (verticalInner + verticalOuter) / (2.0 * horizontal);

  return {
    mar,
    valid: true,
  };
}

/**
 * Computes Euler angles (Pitch, Yaw, Roll in degrees) from a 4x4 facial transformation matrix.
 * Supports raw number array, Float32Array, or Matrix object from MediaPipe.
 */
export function computeHeadPose(
  matrixInput:
    | readonly number[]
    | Float32Array
    | { data: readonly number[] | Float32Array }
    | null
    | undefined
): HeadPoseResult {
  if (!matrixInput) {
    return { pitch: 0.0, yaw: 0.0, roll: 0.0, valid: false };
  }

  const data = "data" in matrixInput ? matrixInput.data : matrixInput;
  if (!data || data.length < 16) {
    return { pitch: 0.0, yaw: 0.0, roll: 0.0, valid: false };
  }

  // MediaPipe Tasks Vision produces column-major 4x4 matrix:
  // [ m0  m4  m8  m12 ]
  // [ m1  m5  m9  m13 ]
  // [ m2  m6  m10 m14 ]
  // [ m3  m7  m11 m15 ]
  const r00 = data[0];
  const r10 = data[1];
  const r20 = data[2];

  const r01 = data[4];
  const r11 = data[5];
  const r21 = data[6];

  const r02 = data[8];
  const r12 = data[9];
  const r22 = data[10];

  const radToDeg = 180 / Math.PI;

  let pitch = 0.0;
  let yaw = 0.0;
  let roll = 0.0;

  // Decompose rotation matrix into Euler angles
  // Clamping for asin domain safety [-1, 1]
  const sy = Math.sqrt(r00 * r00 + r10 * r10);
  const isSingular = sy < 1e-6;

  if (!isSingular) {
    pitch = Math.atan2(r21, r22) * radToDeg;
    yaw = Math.atan2(-r20, sy) * radToDeg;
    roll = Math.atan2(r10, r00) * radToDeg;
  } else {
    pitch = Math.atan2(-r12, r11) * radToDeg;
    yaw = Math.atan2(-r20, sy) * radToDeg;
    roll = 0.0;
  }

  return {
    pitch: Number.isFinite(pitch) ? pitch : 0.0,
    yaw: Number.isFinite(yaw) ? yaw : 0.0,
    roll: Number.isFinite(roll) ? roll : 0.0,
    valid: true,
  };
}
