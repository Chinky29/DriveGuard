import { describe, it, expect } from "vitest";
import {
  computeEAR,
  computeMAR,
  computeHeadPose,
  LandmarkPoint,
  computeEyeEAR,
} from "@/lib/detection/features";
import { DEFAULT_CONFIG } from "@/lib/detection/config";

// Helper to generate 468 dummy landmark points
function createSyntheticLandmarks(overrides: Record<number, LandmarkPoint> = {}): LandmarkPoint[] {
  const landmarks: LandmarkPoint[] = [];
  for (let i = 0; i < 468; i++) {
    landmarks.push(overrides[i] || { x: 0.5, y: 0.5, z: 0.0 });
  }
  return landmarks;
}

describe("Pure Features Extraction", () => {
  describe("computeEAR & computeEyeEAR", () => {
    it("computes expected EAR for synthetic open eye landmarks", () => {
      // 6 points for eye: width = 20, vertical spans = 7 each
      const openEyePoints: LandmarkPoint[] = [
        { x: 0.0, y: 0.0 }, // p1
        { x: 0.05, y: 0.035 }, // p2
        { x: 0.15, y: 0.035 }, // p3
        { x: 0.20, y: 0.0 }, // p4
        { x: 0.15, y: -0.035 }, // p5
        { x: 0.05, y: -0.035 }, // p6
      ];

      const ear = computeEyeEAR(openEyePoints, [0, 1, 2, 3, 4, 5]);
      // (0.07 + 0.07) / (2 * 0.20) = 0.14 / 0.40 = 0.35
      expect(ear).toBeCloseTo(0.35, 3);
    });

    it("computes expected low EAR for synthetic closed eye landmarks", () => {
      const closedEyePoints: LandmarkPoint[] = [
        { x: 0.0, y: 0.0 },
        { x: 0.05, y: 0.005 },
        { x: 0.15, y: 0.005 },
        { x: 0.20, y: 0.0 },
        { x: 0.15, y: -0.005 },
        { x: 0.05, y: -0.005 },
      ];

      const ear = computeEyeEAR(closedEyePoints, [0, 1, 2, 3, 4, 5]);
      // (0.01 + 0.01) / (2 * 0.20) = 0.02 / 0.40 = 0.05
      expect(ear).toBeCloseTo(0.05, 3);
    });

    it("computes both eyes and mean EAR with full 468 synthetic array", () => {
      const overrides: Record<number, LandmarkPoint> = {};
      const { leftEye, rightEye } = DEFAULT_CONFIG.landmarks;

      // Setup left eye as open (0.35)
      overrides[leftEye[0]] = { x: 0.1, y: 0.2 };
      overrides[leftEye[1]] = { x: 0.15, y: 0.235 };
      overrides[leftEye[2]] = { x: 0.25, y: 0.235 };
      overrides[leftEye[3]] = { x: 0.3, y: 0.2 };
      overrides[leftEye[4]] = { x: 0.25, y: 0.165 };
      overrides[leftEye[5]] = { x: 0.15, y: 0.165 };

      // Setup right eye as open (0.35)
      overrides[rightEye[0]] = { x: 0.7, y: 0.2 };
      overrides[rightEye[1]] = { x: 0.75, y: 0.235 };
      overrides[rightEye[2]] = { x: 0.85, y: 0.235 };
      overrides[rightEye[3]] = { x: 0.9, y: 0.2 };
      overrides[rightEye[4]] = { x: 0.85, y: 0.165 };
      overrides[rightEye[5]] = { x: 0.75, y: 0.165 };

      const landmarks = createSyntheticLandmarks(overrides);
      const res = computeEAR(landmarks);

      expect(res.valid).toBe(true);
      expect(res.leftEAR).toBeCloseTo(0.35, 3);
      expect(res.rightEAR).toBeCloseTo(0.35, 3);
      expect(res.avgEAR).toBeCloseTo(0.35, 3);
    });

    it("returns invalid and 0 EAR when landmarks are missing or < 468 points", () => {
      expect(computeEAR(null).valid).toBe(false);
      expect(computeEAR(undefined).valid).toBe(false);
      expect(computeEAR([]).valid).toBe(false);
      expect(computeEAR(new Array(200).fill({ x: 0, y: 0 })).valid).toBe(false);
    });
  });

  describe("computeMAR (Mouth Aspect Ratio)", () => {
    it("computes low MAR for closed mouth", () => {
      const overrides: Record<number, LandmarkPoint> = {};
      const { mouth } = DEFAULT_CONFIG.landmarks;

      // Closed mouth: width = 0.20, small vertical opening = 0.02
      overrides[mouth.leftCorner] = { x: 0.40, y: 0.60 };
      overrides[mouth.rightCorner] = { x: 0.60, y: 0.60 };
      overrides[mouth.upperInner] = { x: 0.50, y: 0.605 };
      overrides[mouth.lowerInner] = { x: 0.50, y: 0.595 };
      overrides[mouth.upperOuter] = { x: 0.50, y: 0.610 };
      overrides[mouth.lowerOuter] = { x: 0.50, y: 0.590 };

      const landmarks = createSyntheticLandmarks(overrides);
      const res = computeMAR(landmarks);

      expect(res.valid).toBe(true);
      // (0.01 + 0.02) / (2 * 0.20) = 0.03 / 0.40 = 0.075 < 0.2
      expect(res.mar).toBeLessThan(0.2);
    });

    it("computes high MAR for open mouth (yawn)", () => {
      const overrides: Record<number, LandmarkPoint> = {};
      const { mouth } = DEFAULT_CONFIG.landmarks;

      // Wide open mouth: width = 0.20, vertical span = 0.16
      overrides[mouth.leftCorner] = { x: 0.40, y: 0.60 };
      overrides[mouth.rightCorner] = { x: 0.60, y: 0.60 };
      overrides[mouth.upperInner] = { x: 0.50, y: 0.66 };
      overrides[mouth.lowerInner] = { x: 0.50, y: 0.54 };
      overrides[mouth.upperOuter] = { x: 0.50, y: 0.69 };
      overrides[mouth.lowerOuter] = { x: 0.50, y: 0.51 };

      const landmarks = createSyntheticLandmarks(overrides);
      const res = computeMAR(landmarks);

      expect(res.valid).toBe(true);
      // (0.12 + 0.18) / (2 * 0.20) = 0.30 / 0.40 = 0.75 > 0.55
      expect(res.mar).toBeGreaterThan(0.55);
    });

    it("returns invalid MAR for insufficient landmarks", () => {
      expect(computeMAR(null).valid).toBe(false);
      expect(computeMAR(new Array(10).fill({ x: 0, y: 0 })).valid).toBe(false);
    });
  });

  describe("computeHeadPose", () => {
    it("extracts neutral pose (near 0 degrees) from identity matrix", () => {
      // Identity 4x4
      const identity = [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1,
      ];

      const res = computeHeadPose(identity);
      expect(res.valid).toBe(true);
      expect(res.pitch).toBeCloseTo(0, 1);
      expect(res.yaw).toBeCloseTo(0, 1);
      expect(res.roll).toBeCloseTo(0, 1);
    });

    it("extracts pitch angle from downward rotated matrix", () => {
      // Rotation around X by -20 degrees (pitch = -20)
      const rad = (-20 * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);

      // Column-major rotation around X
      const matrix = [
        1, 0, 0, 0,
        0, cos, sin, 0,
        0, -sin, cos, 0,
        0, 0, 0, 1,
      ];

      const res = computeHeadPose(matrix);
      expect(res.valid).toBe(true);
      expect(res.pitch).toBeCloseTo(-20, 1);
    });

    it("handles null or insufficient matrix data gracefully", () => {
      expect(computeHeadPose(null).valid).toBe(false);
      expect(computeHeadPose(undefined).valid).toBe(false);
      expect(computeHeadPose([1, 0, 0]).valid).toBe(false);
    });
  });
});
