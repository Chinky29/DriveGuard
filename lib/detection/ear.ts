import { Point2D } from "@/lib/types";

/**
 * Calculates Euclidean distance between two 2D points.
 */
export function euclideanDistance(p1: Point2D, p2: Point2D): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculates Eye Aspect Ratio (EAR) from 6 landmark points.
 *
 * Implements Rule 5 (Pure Mathematical Functions):
 * Pure Soukupová & Čech (2016) formula:
 * EAR = (||p2 - p6|| + ||p3 - p5||) / (2 * ||p1 - p4||)
 *
 * @param points Array of 6 landmark points: [p1, p2, p3, p4, p5, p6]
 * @returns Eye aspect ratio as a positive number. Returns 0.0 if horizontal distance is near zero.
 */
export function calculateEar(points: readonly Point2D[]): number {
  if (points.length < 6) {
    throw new Error(`EAR requires 6 landmark points, received ${points.length}`);
  }

  const [p1, p2, p3, p4, p5, p6] = points;

  const vertical1 = euclideanDistance(p2, p6);
  const vertical2 = euclideanDistance(p3, p5);
  const horizontal = euclideanDistance(p1, p4);

  if (horizontal < 1e-6) {
    return 0.0;
  }

  return (vertical1 + vertical2) / (2.0 * horizontal);
}

/**
 * Computes mean EAR across both eyes.
 */
export function computeBothEyesEar(leftEar: number, rightEar: number): number {
  return (leftEar + rightEar) / 2.0;
}
