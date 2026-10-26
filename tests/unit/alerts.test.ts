import { describe, it, expect } from "vitest";
import { AlertManager } from "@/lib/detection/alerts";
import { DEFAULT_CONFIG } from "@/lib/detection/config";

describe("AlertManager & Cooldown Logic", () => {
  it("keeps Normal level silent without triggering alarms", () => {
    const alerts = new AlertManager(DEFAULT_CONFIG);
    const res = alerts.evaluate("Normal", true, 10.0);

    expect(res.level).toBe("Normal");
    expect(res.triggered).toBe(false);
    expect(res.suppressedByCooldown).toBe(false);
  });

  it("triggers Notice alert and suppresses subsequent alerts within cooldown", () => {
    const alerts = new AlertManager(DEFAULT_CONFIG);

    // First Notice at t=10.0s -> Fires
    const res1 = alerts.evaluate("Notice", true, 10.0, ["mild fatigue"]);
    expect(res1.level).toBe("Notice");
    expect(res1.triggered).toBe(true);
    expect(res1.suppressedByCooldown).toBe(false);

    // Second Notice at t=12.0s (Notice cooldown is 6.0s) -> Suppressed!
    const res2 = alerts.evaluate("Notice", true, 12.0, ["mild fatigue"]);
    expect(res2.level).toBe("Notice");
    expect(res2.triggered).toBe(false);
    expect(res2.suppressedByCooldown).toBe(true);

    // Third Notice at t=16.5s (> 6.0s elapsed) -> Fires again!
    const res3 = alerts.evaluate("Notice", true, 16.5, ["mild fatigue"]);
    expect(res3.level).toBe("Notice");
    expect(res3.triggered).toBe(true);
    expect(res3.suppressedByCooldown).toBe(false);
  });

  it("escalates immediately from Notice to Warning without waiting for Notice cooldown", () => {
    const alerts = new AlertManager(DEFAULT_CONFIG);

    // Notice at t=10.0s
    alerts.evaluate("Notice", true, 10.0, ["mild fatigue"]);

    // Warning at t=11.0s (only 1s after Notice) -> Fires immediately!
    const resWarning = alerts.evaluate("Warning", true, 11.0, ["prolonged eye closure"]);
    expect(resWarning.level).toBe("Warning");
    expect(resWarning.triggered).toBe(true);
    expect(resWarning.suppressedByCooldown).toBe(false);
  });

  it("handles Face Not Visible as non-alarm state that escalates only after 5s timeout", () => {
    const alerts = new AlertManager(DEFAULT_CONFIG);

    // t=10.0s: Face tracking lost
    const lost1 = alerts.evaluate("Normal", false, 10.0);
    expect(lost1.level).toBe("FaceNotVisible");
    expect(lost1.triggered).toBe(false); // Non-alarm!
    expect(lost1.message).toContain("Face not reliably detected");

    // t=13.0s: 3.0s lost (< 5.0s timeout) -> Still non-alarm
    const lost2 = alerts.evaluate("Normal", false, 13.0);
    expect(lost2.level).toBe("FaceNotVisible");
    expect(lost2.triggered).toBe(false);

    // t=15.5s: 5.5s lost (> 5.0s timeout) -> Escalates to Warning alert!
    const lostEscalated = alerts.evaluate("Normal", false, 15.5);
    expect(lostEscalated.level).toBe("Warning");
    expect(lostEscalated.triggered).toBe(true);
    expect(lostEscalated.message).toContain("Face tracking lost for extended duration");

    // t=16.0s: Face recovered!
    const recovered = alerts.evaluate("Normal", true, 16.0);
    expect(recovered.level).toBe("Normal");
    expect(recovered.triggered).toBe(false);
  });
});
