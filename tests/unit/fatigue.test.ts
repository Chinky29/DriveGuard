import { describe, it, expect } from "vitest";
import {
  computeComponentScores,
  computeFusedFatigueScore,
  getRawFatigueLevel,
  extractFatigueReasons,
  FusedFatigueTracker,
  FatigueSignals,
} from "@/lib/detection/fatigue";
import { DEFAULT_CONFIG } from "@/lib/detection/config";

describe("Fused Fatigue Scoring & Temporal Hysteresis", () => {
  describe("Component Sub-Scores & Weighting", () => {
    it("returns zero component scores for nominal attentive signals", () => {
      const signals: FatigueSignals = {
        timestamp: 0,
        isFaceReliable: true,
        perclos: 0.02,
        blinkDurationSeconds: 0.20,
        yawnRatePerMinute: 0,
        isYawning: false,
        nodCount: 0,
        isNodding: false,
        microsleepCount: 0,
        isMicrosleep: false,
      };

      const comp = computeComponentScores(signals);
      expect(comp.perclosScore).toBeLessThan(10);
      expect(comp.microsleepScore).toBe(0);
      expect(comp.yawnScore).toBe(0);
      expect(comp.nodScore).toBe(0);
      expect(comp.blinkDurationScore).toBe(0);

      const score = computeFusedFatigueScore(comp, DEFAULT_CONFIG);
      expect(score).toBeLessThan(10);
      expect(getRawFatigueLevel(score, DEFAULT_CONFIG)).toBe("Normal");
    });

    it("evaluates active microsleep event with high score contribution", () => {
      const signals: FatigueSignals = {
        timestamp: 10,
        isFaceReliable: true,
        perclos: 0.10,
        blinkDurationSeconds: 1.2,
        yawnRatePerMinute: 0,
        isYawning: false,
        nodCount: 0,
        isNodding: false,
        microsleepCount: 1,
        isMicrosleep: true,
      };

      const comp = computeComponentScores(signals);
      expect(comp.microsleepScore).toBe(100);
      expect(comp.blinkDurationScore).toBe(100);

      const score = computeFusedFatigueScore(comp, DEFAULT_CONFIG);
      // Microsleep weight 0.25 (25) + blink 0.10 (10) + perclos ~28*0.35 (~10) = ~45+
      expect(score).toBeGreaterThanOrEqual(40);
      expect(getRawFatigueLevel(score, DEFAULT_CONFIG)).toMatch(/Notice|Warning|Critical/);
    });

    it("constructs strictly neutral physiological descriptions (Rule 1)", () => {
      const comp = {
        perclosScore: 85,
        microsleepScore: 100,
        yawnScore: 80,
        nodScore: 90,
        blinkDurationScore: 70,
      };

      const reasons = extractFatigueReasons(comp, 85, DEFAULT_CONFIG);
      expect(reasons).toContain("microsleep event detected");
      expect(reasons).toContain("high eye closure proportion (PERCLOS)");
      expect(reasons).toContain("sustained downward head nodding");
      expect(reasons).toContain("frequent or prolonged yawning");
      expect(reasons).toContain("elevated blink closure duration");

      // Verify no forbidden subjective words
      const joined = reasons.join(" ");
      expect(joined).not.toMatch(/drowsy|unsafe|asleep|sleepy/i);
    });
  });

  describe("Temporal Hysteresis State Machine", () => {
    it("escalates level only after condition is sustained for >= 1.5s", () => {
      const tracker = new FusedFatigueTracker(DEFAULT_CONFIG);

      // t=0s: Nominal attentive
      const initSnap = tracker.update({
        timestamp: 0.0,
        isFaceReliable: true,
        perclos: 0.02,
        blinkDurationSeconds: 0.2,
        yawnRatePerMinute: 0,
        isYawning: false,
        nodCount: 0,
        isNodding: false,
        microsleepCount: 0,
        isMicrosleep: false,
      });
      expect(initSnap.level).toBe("Normal");

      // t=1.0s: Sudden extreme fatigue signals (raw level Critical)
      const criticalSignals: FatigueSignals = {
        timestamp: 1.0,
        isFaceReliable: true,
        perclos: 0.40,
        blinkDurationSeconds: 1.2,
        yawnRatePerMinute: 3.0,
        isYawning: true,
        nodCount: 2,
        isNodding: true,
        microsleepCount: 2,
        isMicrosleep: true,
      };

      const spikeSnap = tracker.update(criticalSignals);
      expect(spikeSnap.rawLevel).toBe("Critical");
      // Hysteresis: Must NOT immediately escalate without sustain duration
      expect(spikeSnap.level).toBe("Normal");

      // t=2.0s: 1.0s elapsed (< 1.5s sustain)
      const midwaySnap = tracker.update({ ...criticalSignals, timestamp: 2.0 });
      expect(midwaySnap.level).toBe("Normal");

      // t=2.6s: 1.6s elapsed (>= 1.5s sustain) -> Escalates to Critical!
      const escalatedSnap = tracker.update({ ...criticalSignals, timestamp: 2.6 });
      expect(escalatedSnap.level).toBe("Critical");
    });

    it("drops level only after recovery duration >= 3.0s", () => {
      const tracker = new FusedFatigueTracker(DEFAULT_CONFIG);

      const highSignals: FatigueSignals = {
        timestamp: 0.0,
        isFaceReliable: true,
        perclos: 0.35,
        blinkDurationSeconds: 1.0,
        yawnRatePerMinute: 2,
        isYawning: false,
        nodCount: 1,
        isNodding: true,
        microsleepCount: 1,
        isMicrosleep: true,
      };

      // Sustain at high level for 2.0s to establish Warning/Critical
      tracker.update({ ...highSignals, timestamp: 0.0 });
      const estSnap = tracker.update({ ...highSignals, timestamp: 2.0 });
      expect(["Warning", "Critical"]).toContain(estSnap.level);
      const elevatedLevel = estSnap.level;

      // t=3.0s: Driver opens eyes and returns to nominal attentive state
      const recoverySignals: FatigueSignals = {
        timestamp: 3.0,
        isFaceReliable: true,
        perclos: 0.02,
        blinkDurationSeconds: 0.2,
        yawnRatePerMinute: 0,
        isYawning: false,
        nodCount: 0,
        isNodding: false,
        microsleepCount: 0,
        isMicrosleep: false,
      };

      const startRecovSnap = tracker.update(recoverySignals);
      expect(startRecovSnap.rawLevel).toBe("Normal");
      // Level must stay elevated during recovery window!
      expect(startRecovSnap.level).toBe(elevatedLevel);

      // t=4.5s: 1.5s recovery (< 3.0s) -> Still elevated
      const midwayRecov = tracker.update({ ...recoverySignals, timestamp: 4.5 });
      expect(midwayRecov.level).toBe(elevatedLevel);

      // t=6.1s: 3.1s recovery (>= 3.0s) -> De-escalates to Normal!
      const deescalatedSnap = tracker.update({ ...recoverySignals, timestamp: 6.1 });
      expect(deescalatedSnap.level).toBe("Normal");
    });

    it("enforces Rule 2: Pauses and resets immediately when face is unreliable", () => {
      const tracker = new FusedFatigueTracker(DEFAULT_CONFIG);

      // Ingest severe fatigue cues but with isFaceReliable = false
      const snap = tracker.update({
        timestamp: 10.0,
        isFaceReliable: false,
        perclos: 0.50,
        blinkDurationSeconds: 2.0,
        yawnRatePerMinute: 4.0,
        isYawning: true,
        nodCount: 3,
        isNodding: true,
        microsleepCount: 2,
        isMicrosleep: true,
      });

      expect(snap.level).toBe("Normal");
      expect(snap.score).toBe(0);
      expect(snap.reasons).toContain(DEFAULT_CONFIG.reliability.unreliableReason);
    });
  });
});
