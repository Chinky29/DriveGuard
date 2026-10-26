import { describe, it, expect } from "vitest";
import { evaluateTemporalFusion } from "@/lib/detection/fusion";
import { AdvisoryLevel } from "@/lib/types";

describe("Temporal Fusion State Machine", () => {
  it("enforces Rule 2: Returns UNKNOWN with 'Face not reliably detected' when face is unreliable", () => {
    const decision = evaluateTemporalFusion({
      timestamp: 1000,
      faceReliable: false,
      eyeClosureDuration: 5.0, // High duration should still be ignored
      perclos: 0.9,
      headDeviationDuration: 4.0,
    });

    expect(decision.level).toBe(AdvisoryLevel.UNKNOWN);
    expect(decision.reason).toBe("Face not reliably detected");
  });

  it("enforces Rule 1: Returns NORMAL and Attentive when all cues are nominal", () => {
    const decision = evaluateTemporalFusion({
      timestamp: 1000,
      faceReliable: true,
      eyeClosureDuration: 0.0,
      perclos: 0.02,
      headDeviationDuration: 0.0,
    });

    expect(decision.level).toBe(AdvisoryLevel.NORMAL);
    expect(decision.reason).toBe("Attentive - Nominal");
  });

  it("triggers WARNING for sustained eye closure with neutral physiological description", () => {
    const decision = evaluateTemporalFusion({
      timestamp: 1000,
      faceReliable: true,
      eyeClosureDuration: 2.0, // Exceeds 1.8s
      perclos: 0.05,
      headDeviationDuration: 0.0,
    });

    expect(decision.level).toBe(AdvisoryLevel.WARNING);
    expect(decision.reason).toBe("prolonged eye closure");
    // Strictly verify no forbidden words
    expect(decision.reason).not.toMatch(/drowsy|unsafe|asleep/i);
  });

  it("triggers NOTICE for mild head deviation", () => {
    const decision = evaluateTemporalFusion({
      timestamp: 1000,
      faceReliable: true,
      eyeClosureDuration: 0.0,
      perclos: 0.02,
      headDeviationDuration: 1.6, // Exceeds 1.5s
    });

    expect(decision.level).toBe(AdvisoryLevel.NOTICE);
    expect(decision.reason).toBe("sustained head deviation");
  });

  it("triggers dual reason when both head deviation and eye closure are sustained", () => {
    const decision = evaluateTemporalFusion({
      timestamp: 1000,
      faceReliable: true,
      eyeClosureDuration: 2.0,
      perclos: 0.05,
      headDeviationDuration: 3.0,
    });

    expect(decision.level).toBe(AdvisoryLevel.WARNING);
    expect(decision.reason).toBe("sustained head deviation and eye closure");
  });
});
