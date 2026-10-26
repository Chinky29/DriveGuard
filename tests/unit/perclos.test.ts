import { describe, it, expect } from "vitest";
import {
  DriverMetricsTracker,
  isBlinkDuration,
  isMicrosleepDuration,
  isYawnDuration,
  isNodEvent,
  calculateSlidingWindowPerclos,
} from "@/lib/detection/perclos";
import { DEFAULT_CONFIG } from "@/lib/detection/config";

describe("Temporal Fatigue & Alertness Metrics", () => {
  describe("Pure Threshold Evaluation Functions", () => {
    it("detects valid blink durations between 100ms and 400ms", () => {
      expect(isBlinkDuration(0.05)).toBe(false); // Too short (< 100ms)
      expect(isBlinkDuration(0.15)).toBe(true);  // Valid 150ms
      expect(isBlinkDuration(0.30)).toBe(true);  // Valid 300ms
      expect(isBlinkDuration(0.50)).toBe(false); // Too long (> 400ms)
    });

    it("detects microsleep duration when eye closure exceeds 1.0s", () => {
      expect(isMicrosleepDuration(0.8)).toBe(false);
      expect(isMicrosleepDuration(1.0)).toBe(true);
      expect(isMicrosleepDuration(1.8)).toBe(true);
    });

    it("detects yawn duration when mouth opening exceeds 1.5s", () => {
      expect(isYawnDuration(1.0)).toBe(false);
      expect(isYawnDuration(1.5)).toBe(true);
      expect(isYawnDuration(2.2)).toBe(true);
    });

    it("detects nod event when pitch drops and is sustained", () => {
      // Threshold: <= -12 deg for >= 0.8s
      expect(isNodEvent(-5.0, 1.0)).toBe(false);   // Not deep enough
      expect(isNodEvent(-15.0, 0.4)).toBe(false);  // Too brief
      expect(isNodEvent(-15.0, 0.9)).toBe(true);   // Sustained downward nod
    });

    it("calculates accurate sliding-window PERCLOS", () => {
      const samples = [
        { timestamp: 10, isClosed: false },
        { timestamp: 20, isClosed: true },
        { timestamp: 30, isClosed: false },
        { timestamp: 40, isClosed: true },
      ];
      // In [0, 40], 2 out of 4 samples closed = 0.50
      expect(calculateSlidingWindowPerclos(samples, 60, 40)).toBeCloseTo(0.50, 2);
    });
  });

  describe("DriverMetricsTracker State Timeline Tests", () => {
    it("timeline 1: Open eyes maintains 0 PERCLOS and 0 blinks", () => {
      const tracker = new DriverMetricsTracker(DEFAULT_CONFIG);

      for (let t = 0; t <= 10; t += 1) {
        const snapshot = tracker.update({
          timestamp: t,
          ear: 0.32, // Open
          mar: 0.10, // Closed mouth
          pitch: 0.0, // Neutral
          isFaceReliable: true,
        });

        expect(snapshot.perclos).toBe(0.0);
        expect(snapshot.blinkCount).toBe(0);
        expect(snapshot.isMicrosleep).toBe(false);
        expect(snapshot.isYawning).toBe(false);
        expect(snapshot.isNodding).toBe(false);
      }
    });

    it("timeline 2: A normal blink increments blink count and computes blink rate", () => {
      const tracker = new DriverMetricsTracker(DEFAULT_CONFIG);

      // t=0s: Open
      tracker.update({ timestamp: 0.0, ear: 0.32, mar: 0.1, pitch: 0, isFaceReliable: true });

      // t=1.0s: Eye starts closing (EAR < 0.21)
      tracker.update({ timestamp: 1.0, ear: 0.15, mar: 0.1, pitch: 0, isFaceReliable: true });

      // t=1.2s: Eye closed (closure duration = 200 ms)
      const closedSnap = tracker.update({
        timestamp: 1.2,
        ear: 0.14,
        mar: 0.1,
        pitch: 0,
        isFaceReliable: true,
      });
      expect(closedSnap.isEyeClosed).toBe(true);
      expect(closedSnap.isMicrosleep).toBe(false);

      // t=1.25s: Eye reopens (EAR >= 0.23)
      const reopenSnap = tracker.update({
        timestamp: 1.25,
        ear: 0.30,
        mar: 0.1,
        pitch: 0,
        isFaceReliable: true,
      });

      // Blink of 250ms completed!
      expect(reopenSnap.isBlink).toBe(true);
      expect(reopenSnap.blinkCount).toBe(1);
      expect(reopenSnap.microsleepCount).toBe(0);
      expect(reopenSnap.blinkRatePerMinute).toBeGreaterThan(0);
    });

    it("timeline 3: A long eye closure triggers microsleep and does not count as a normal blink", () => {
      const tracker = new DriverMetricsTracker(DEFAULT_CONFIG);

      // t=0.0s: Open
      tracker.update({ timestamp: 0.0, ear: 0.30, mar: 0.1, pitch: 0, isFaceReliable: true });

      // t=1.0s: Eye closes
      tracker.update({ timestamp: 1.0, ear: 0.12, mar: 0.1, pitch: 0, isFaceReliable: true });

      // t=1.5s: 0.5s closed (< 1.0s)
      const midSnap = tracker.update({ timestamp: 1.5, ear: 0.12, mar: 0.1, pitch: 0, isFaceReliable: true });
      expect(midSnap.isMicrosleep).toBe(false);

      // t=2.2s: 1.2s closed (>= 1.0s microsleep threshold)
      const microsleepSnap = tracker.update({
        timestamp: 2.2,
        ear: 0.11,
        mar: 0.1,
        pitch: 0,
        isFaceReliable: true,
      });
      expect(microsleepSnap.isMicrosleep).toBe(true);
      expect(microsleepSnap.microsleepCount).toBe(1);

      // t=2.5s: Reopen
      const reopenSnap = tracker.update({
        timestamp: 2.5,
        ear: 0.31,
        mar: 0.1,
        pitch: 0,
        isFaceReliable: true,
      });

      // Long closure must NOT be counted as a normal blink
      expect(reopenSnap.blinkCount).toBe(0);
      expect(reopenSnap.microsleepCount).toBe(1);
    });

    it("timeline 4: A sustained yawn triggers yawn detection and increments yawn count", () => {
      const tracker = new DriverMetricsTracker(DEFAULT_CONFIG);

      // Mouth closed
      tracker.update({ timestamp: 0.0, ear: 0.30, mar: 0.1, pitch: 0, isFaceReliable: true });

      // Mouth opens wide (MAR = 0.70 >= 0.55) at t=1.0s
      tracker.update({ timestamp: 1.0, ear: 0.30, mar: 0.70, pitch: 0, isFaceReliable: true });

      // t=2.0s (duration = 1.0s < 1.5s)
      const midYawn = tracker.update({ timestamp: 2.0, ear: 0.30, mar: 0.70, pitch: 0, isFaceReliable: true });
      expect(midYawn.isYawning).toBe(false);
      expect(midYawn.yawnCount).toBe(0);

      // t=2.8s (duration = 1.8s >= 1.5s)
      const sustainedYawn = tracker.update({
        timestamp: 2.8,
        ear: 0.30,
        mar: 0.72,
        pitch: 0,
        isFaceReliable: true,
      });
      expect(sustainedYawn.isYawning).toBe(true);
      expect(sustainedYawn.yawnCount).toBe(1);

      // Mouth closes at t=3.5s
      const closedMouth = tracker.update({
        timestamp: 3.5,
        ear: 0.30,
        mar: 0.15,
        pitch: 0,
        isFaceReliable: true,
      });
      expect(closedMouth.isYawning).toBe(false);
      expect(closedMouth.yawnCount).toBe(1);
    });

    it("timeline 5: A sustained pitch drop triggers head nod detection", () => {
      const tracker = new DriverMetricsTracker(DEFAULT_CONFIG);

      // Neutral pitch
      tracker.update({ timestamp: 0.0, ear: 0.30, mar: 0.1, pitch: 0, isFaceReliable: true });

      // Pitch drops down to -16° (<= -12°) at t=1.0s
      tracker.update({ timestamp: 1.0, ear: 0.30, mar: 0.1, pitch: -16.0, isFaceReliable: true });

      // t=1.5s (0.5s duration < 0.8s)
      const briefNod = tracker.update({ timestamp: 1.5, ear: 0.30, mar: 0.1, pitch: -15.0, isFaceReliable: true });
      expect(briefNod.isNodding).toBe(false);

      // t=2.0s (1.0s duration >= 0.8s)
      const sustainedNod = tracker.update({
        timestamp: 2.0,
        ear: 0.30,
        mar: 0.1,
        pitch: -15.5,
        isFaceReliable: true,
      });
      expect(sustainedNod.isNodding).toBe(true);
      expect(sustainedNod.nodCount).toBe(1);

      // Returns to neutral pitch at t=2.5s
      const neutralHead = tracker.update({
        timestamp: 2.5,
        ear: 0.30,
        mar: 0.1,
        pitch: -2.0,
        isFaceReliable: true,
      });
      expect(neutralHead.isNodding).toBe(false);
      expect(neutralHead.nodCount).toBe(1);
    });

    it("timeline 6: Missing face pauses tracking and safely resets continuous accumulators (Rule 2)", () => {
      const tracker = new DriverMetricsTracker(DEFAULT_CONFIG);

      // Eye starts closing and head drops at t=1.0s
      tracker.update({ timestamp: 1.0, ear: 0.10, mar: 0.70, pitch: -20.0, isFaceReliable: true });
      tracker.update({ timestamp: 1.5, ear: 0.10, mar: 0.70, pitch: -20.0, isFaceReliable: true });

      // t=1.7s: Face tracking is LOST (occlusion / out of frame)
      const lostFaceSnap = tracker.update({
        timestamp: 1.7,
        ear: 0.0,
        mar: 0.0,
        pitch: 0.0,
        isFaceReliable: false,
      });

      expect(lostFaceSnap.isFaceReliable).toBe(false);
      expect(lostFaceSnap.eyeClosureDuration).toBe(0.0);
      expect(lostFaceSnap.yawnDuration).toBe(0.0);
      expect(lostFaceSnap.nodDuration).toBe(0.0);
      expect(lostFaceSnap.isMicrosleep).toBe(false);
      expect(lostFaceSnap.isYawning).toBe(false);
      expect(lostFaceSnap.isNodding).toBe(false);
      expect(lostFaceSnap.microsleepCount).toBe(0);
      expect(lostFaceSnap.blinkCount).toBe(0);
    });
  });
});
