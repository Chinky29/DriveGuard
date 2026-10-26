import { describe, it, expect } from "vitest";
import { DEFAULT_CONFIG } from "@/lib/detection/config";

describe("DriveGuard Configuration Schema", () => {
  it("should define non-zero, properly bounded EAR thresholds", () => {
    expect(DEFAULT_CONFIG.ear.lowThreshold).toBeGreaterThan(0.1);
    expect(DEFAULT_CONFIG.ear.lowThreshold).toBeLessThan(0.3);
    expect(DEFAULT_CONFIG.ear.veryLowThreshold).toBeLessThan(DEFAULT_CONFIG.ear.lowThreshold);
    expect(DEFAULT_CONFIG.ear.reopenThreshold).toBeGreaterThan(DEFAULT_CONFIG.ear.lowThreshold);
  });

  it("should define PERCLOS time window and positive thresholds", () => {
    expect(DEFAULT_CONFIG.perclos.windowSeconds).toBe(60.0);
    expect(DEFAULT_CONFIG.perclos.noticeThreshold).toBeLessThan(
      DEFAULT_CONFIG.perclos.warningThreshold
    );
  });

  it("should configure 6-point landmark indices for left and right eyes", () => {
    expect(DEFAULT_CONFIG.landmarks.leftEye).toHaveLength(6);
    expect(DEFAULT_CONFIG.landmarks.rightEye).toHaveLength(6);
  });

  it("should enforce Rule 2 reliability threshold of 468+ landmarks", () => {
    expect(DEFAULT_CONFIG.reliability.minLandmarksRequired).toBe(468);
    expect(DEFAULT_CONFIG.reliability.unreliableReason).toBe("Face not reliably detected");
  });
});
