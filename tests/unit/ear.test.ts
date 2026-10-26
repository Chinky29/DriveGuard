import { describe, it, expect } from "vitest";
import { calculateEar, euclideanDistance, computeBothEyesEar } from "@/lib/detection/ear";
import { Point2D } from "@/lib/types";

describe("Pure Eye Aspect Ratio (EAR) Math", () => {
  it("should calculate correct Euclidean distance", () => {
    const p1: Point2D = { x: 0, y: 0 };
    const p2: Point2D = { x: 3, y: 4 };
    expect(euclideanDistance(p1, p2)).toBeCloseTo(5.0, 5);
  });

  it("should calculate expected EAR for synthetic open eye geometry", () => {
    // Synthetic open eye: width = 20, vertical spans = 7 each
    const openEye: Point2D[] = [
      { x: 0, y: 0 }, // p1 (outer corner)
      { x: 5, y: 3.5 }, // p2 (top outer)
      { x: 15, y: 3.5 }, // p3 (top inner)
      { x: 20, y: 0 }, // p4 (inner corner)
      { x: 15, y: -3.5 }, // p5 (bottom inner)
      { x: 5, y: -3.5 }, // p6 (bottom outer)
    ];

    const ear = calculateEar(openEye);
    // vertical1 = 7, vertical2 = 7, horizontal = 20 -> (7+7) / (2*20) = 14/40 = 0.35
    expect(ear).toBeCloseTo(0.35, 4);
  });

  it("should calculate low EAR for synthetic closed eye geometry", () => {
    // Synthetic closed eye: width = 20, vertical spans = 1 each
    const closedEye: Point2D[] = [
      { x: 0, y: 0 },
      { x: 5, y: 0.5 },
      { x: 15, y: 0.5 },
      { x: 20, y: 0 },
      { x: 15, y: -0.5 },
      { x: 5, y: -0.5 },
    ];

    const ear = calculateEar(closedEye);
    // (1 + 1) / (2 * 20) = 2/40 = 0.05
    expect(ear).toBeCloseTo(0.05, 4);
  });

  it("should handle degenerate horizontal zero-width without throwing or dividing by zero", () => {
    const degenerateEye: Point2D[] = [
      { x: 0, y: 0 },
      { x: 0, y: 2 },
      { x: 0, y: 2 },
      { x: 0, y: 0 },
      { x: 0, y: -2 },
      { x: 0, y: -2 },
    ];

    expect(calculateEar(degenerateEye)).toBe(0.0);
  });

  it("should accurately average both eyes", () => {
    expect(computeBothEyesEar(0.32, 0.34)).toBeCloseTo(0.33, 4);
  });
});
