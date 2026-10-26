import { describe, it, expect } from "vitest";
import {
  calculateMedian,
  calculateMAD,
  filterOutliersMAD,
  computeRobustBaseline,
  deriveCalibratedThresholds,
  DriverCalibrationSession,
} from "@/lib/detection/calibration";
import { DEFAULT_CONFIG } from "@/lib/detection/config";

describe("Driver Calibration Engine", () => {
  describe("Statistical Median & Outlier Rejection", () => {
    it("calculates median for odd and even length arrays", () => {
      expect(calculateMedian([0.2, 0.3, 0.4])).toBeCloseTo(0.3, 3);
      expect(calculateMedian([0.2, 0.3, 0.4, 0.5])).toBeCloseTo(0.35, 3);
      expect(calculateMedian([0.3])).toBeCloseTo(0.3, 3);
      expect(calculateMedian([])).toBe(0.0);
    });

    it("calculates median absolute deviation (MAD)", () => {
      const data = [1, 2, 3, 4, 5, 6, 9];
      const median = calculateMedian(data); // 4
      const mad = calculateMAD(data, median); // |d - 4| = [3, 2, 1, 0, 1, 2, 5], sorted = [0, 1, 1, 2, 2, 3, 5], median = 2
      expect(mad).toBe(2);
    });

    it("filters out extreme outliers using median-based MAD filter", () => {
      // Normal EAR readings around 0.32 with a blink (0.05) and a sensor spike (0.80)
      const ears = [0.31, 0.32, 0.33, 0.32, 0.31, 0.05, 0.32, 0.33, 0.80, 0.32];
      const inliers = filterOutliersMAD(ears, 2.5);

      expect(inliers).not.toContain(0.05);
      expect(inliers).not.toContain(0.80);
      expect(inliers.length).toBe(8);

      const baseline = computeRobustBaseline(ears, 2.5, 0.30);
      expect(baseline).toBeCloseTo(0.32, 2);
    });

    it("derives personalized thresholds bounded by safety limits", () => {
      const thresholds = deriveCalibratedThresholds(0.32, 0.15, false, 200, DEFAULT_CONFIG);

      expect(thresholds.isDefault).toBe(false);
      expect(thresholds.baselineEAR).toBe(0.32);
      expect(thresholds.baselineMAR).toBe(0.15);
      // earLow = 0.32 * 0.70 = 0.224
      expect(thresholds.earLowThreshold).toBeCloseTo(0.224, 3);
      // earReopen = 0.224 + 0.02 = 0.244
      expect(thresholds.earReopenThreshold).toBeCloseTo(0.244, 3);
      // marOpen = max(0.15 * 2.5 = 0.375, 0.50) = 0.50
      expect(thresholds.marOpenThreshold).toBe(0.50);
    });
  });

  describe("DriverCalibrationSession Lifecycle", () => {
    it("tracks 20-second progress and completes with sufficient valid samples", () => {
      const session = new DriverCalibrationSession(DEFAULT_CONFIG);

      // t=0s to t=20s at 10 FPS (200 samples)
      for (let t = 0; t <= 20; t += 0.1) {
        session.addSample(t, 0.31 + Math.sin(t) * 0.01, 0.14, true);
      }

      const progress = session.getProgress(20.0);
      expect(progress.isComplete).toBe(true);
      expect(progress.progressRatio).toBe(1.0);
      expect(progress.remainingSeconds).toBe(0.0);
      expect(progress.sampleCount).toBeGreaterThan(100);

      const result = session.finish();
      expect(result.isDefault).toBe(false);
      expect(result.baselineEAR).toBeCloseTo(0.31, 2);
      expect(result.baselineMAR).toBeCloseTo(0.14, 2);
    });

    it("ignores samples when face is not reliable (Rule 2)", () => {
      const session = new DriverCalibrationSession(DEFAULT_CONFIG);

      // 50 frames with lost tracking
      for (let t = 0; t < 5; t += 0.1) {
        session.addSample(t, 0.30, 0.15, false);
      }

      const progress = session.getProgress(5.0);
      expect(progress.sampleCount).toBe(0);
      expect(progress.isFaceReliable).toBe(false);
    });

    it("falls back to defaults if calibration is skipped", () => {
      const session = new DriverCalibrationSession(DEFAULT_CONFIG);
      const result = session.skip("User clicked skip");

      expect(result.isDefault).toBe(true);
      expect(result.baselineEAR).toBe(DEFAULT_CONFIG.calibration.defaultEar);
      expect(result.baselineMAR).toBe(DEFAULT_CONFIG.calibration.defaultMar);
      expect(result.reason).toContain("User clicked skip");
    });

    it("falls back to defaults if samples are below minValidSamples", () => {
      const session = new DriverCalibrationSession(DEFAULT_CONFIG);

      // Only 5 frames collected
      for (let t = 0; t < 0.5; t += 0.1) {
        session.addSample(t, 0.30, 0.15, true);
      }

      const result = session.finish();
      expect(result.isDefault).toBe(true);
      expect(result.reason).toContain("Insufficient valid samples");
    });
  });
});
