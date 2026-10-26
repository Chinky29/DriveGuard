/**
 * DriveGuard Driver Baseline Calibration Engine
 *
 * Implements Rule 5 (Pure Mathematical Functions & Testability):
 * - 20-second calibration session collecting EAR and MAR baseline
 * - Outlier rejection using Median Absolute Deviation (MAD)
 * - Computes personalized eye closure and mouth opening thresholds
 * - Provides graceful fallback to system defaults if skipped or under-sampled
 *
 * Strictly zero React, zero DOM dependencies in core calculation logic.
 */

import { DEFAULT_CONFIG, DriveGuardConfig } from "./config";

export interface CalibrationSample {
  readonly timestamp: number;
  readonly ear: number;
  readonly mar: number;
}

export interface CalibratedThresholds {
  readonly baselineEAR: number;
  readonly baselineMAR: number;
  readonly earLowThreshold: number;
  readonly earVeryLowThreshold: number;
  readonly earReopenThreshold: number;
  readonly marOpenThreshold: number;
  readonly isDefault: boolean;
  readonly sampleCount: number;
  readonly reason?: string;
}

export interface CalibrationProgress {
  readonly elapsedSeconds: number;
  readonly remainingSeconds: number;
  readonly progressRatio: number; // 0.0 to 1.0
  readonly sampleCount: number;
  readonly isComplete: boolean;
  readonly isFaceReliable: boolean;
}

/**
 * Calculates the statistical median of a numeric array.
 */
export function calculateMedian(values: readonly number[]): number {
  if (values.length === 0) return 0.0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 !== 0) {
    return sorted[mid];
  }
  return (sorted[mid - 1] + sorted[mid]) / 2.0;
}

/**
 * Calculates Median Absolute Deviation (MAD) of a numeric array given its median.
 * MAD = median(|x_i - median|)
 */
export function calculateMAD(values: readonly number[], median: number): number {
  if (values.length === 0) return 0.0;
  const deviations = values.map((val) => Math.abs(val - median));
  return calculateMedian(deviations);
}

/**
 * Filters out outliers using a median-based MAD filter.
 * Retains values within [median - k * MAD, median + k * MAD].
 */
export function filterOutliersMAD(
  values: readonly number[],
  madMultiplier: number = 2.5
): number[] {
  if (values.length < 3) return [...values];

  const median = calculateMedian(values);
  const mad = calculateMAD(values, median);

  // If dispersion is practically zero (identical values), return all
  if (mad < 1e-6) {
    return [...values];
  }

  const maxAllowedDeviation = madMultiplier * mad;
  const inliers = values.filter((val) => Math.abs(val - median) <= maxAllowedDeviation);

  // Safeguard: If outlier filter aggressively purges everything, fallback to original
  return inliers.length > 0 ? inliers : [...values];
}

/**
 * Computes robust baseline with outlier rejection.
 */
export function computeRobustBaseline(
  values: readonly number[],
  madMultiplier: number,
  defaultValue: number
): number {
  if (values.length === 0) return defaultValue;
  const inliers = filterOutliersMAD(values, madMultiplier);
  return calculateMedian(inliers);
}

/**
 * Derives personalized thresholds from measured baseline EAR and MAR.
 */
export function deriveCalibratedThresholds(
  baselineEAR: number,
  baselineMAR: number,
  isDefault: boolean,
  sampleCount: number,
  config: DriveGuardConfig = DEFAULT_CONFIG,
  reason?: string
): CalibratedThresholds {
  const { earLowRatio, marOpenRatio } = config.calibration;

  // Personalized EAR low threshold bounded between 0.16 and 0.26
  const rawEarLow = baselineEAR * earLowRatio;
  const earLowThreshold = Math.max(0.16, Math.min(0.26, Number(rawEarLow.toFixed(3))));
  const earVeryLowThreshold = Math.max(0.12, Number((earLowThreshold - 0.05).toFixed(3)));
  const earReopenThreshold = Number((earLowThreshold + 0.02).toFixed(3));

  // Personalized MAR open threshold bounded with a minimum floor of 0.50
  const rawMarOpen = baselineMAR * marOpenRatio;
  const marOpenThreshold = Math.max(0.50, Math.min(0.75, Number(rawMarOpen.toFixed(3))));

  return {
    baselineEAR: Number(baselineEAR.toFixed(3)),
    baselineMAR: Number(baselineMAR.toFixed(3)),
    earLowThreshold,
    earVeryLowThreshold,
    earReopenThreshold,
    marOpenThreshold,
    isDefault,
    sampleCount,
    reason,
  };
}

/**
 * Stateful Driver Calibration Session Manager
 */
export class DriverCalibrationSession {
  private config: DriveGuardConfig;
  private samples: CalibrationSample[] = [];
  private startTime: number | null = null;
  private lastSampleTime: number | null = null;
  private isFaceCurrentlyReliable: boolean = false;

  constructor(config: DriveGuardConfig = DEFAULT_CONFIG) {
    this.config = config;
  }

  /**
   * Resets the calibration session to initial state.
   */
  public reset(): void {
    this.samples = [];
    this.startTime = null;
    this.lastSampleTime = null;
    this.isFaceCurrentlyReliable = false;
  }

  /**
   * Adds a new observation frame to the calibration session.
   */
  public addSample(
    timestamp: number,
    ear: number,
    mar: number,
    isFaceReliable: boolean
  ): void {
    this.lastSampleTime = timestamp;
    this.isFaceCurrentlyReliable = isFaceReliable;

    if (this.startTime === null && isFaceReliable) {
      this.startTime = timestamp;
    }

    // Only collect samples when face tracking is verified reliable (Rule 2)
    if (isFaceReliable && ear > 0.05 && mar > 0.01) {
      this.samples.push({
        timestamp,
        ear,
        mar,
      });
    }
  }

  /**
   * Returns current calibration session progress.
   */
  public getProgress(currentTime: number): CalibrationProgress {
    const duration = this.config.calibration.durationSeconds;

    if (this.startTime === null) {
      return {
        elapsedSeconds: 0.0,
        remainingSeconds: duration,
        progressRatio: 0.0,
        sampleCount: 0,
        isComplete: false,
        isFaceReliable: this.isFaceCurrentlyReliable,
      };
    }

    const elapsed = Math.max(0.0, currentTime - this.startTime);
    const remaining = Math.max(0.0, duration - elapsed);
    const progressRatio = Math.min(1.0, elapsed / duration);
    const isComplete =
      elapsed >= duration && this.samples.length >= this.config.calibration.minValidSamples;

    return {
      elapsedSeconds: Number(elapsed.toFixed(1)),
      remainingSeconds: Number(remaining.toFixed(1)),
      progressRatio: Number(progressRatio.toFixed(3)),
      sampleCount: this.samples.length,
      isComplete,
      isFaceReliable: this.isFaceCurrentlyReliable,
    };
  }

  /**
   * Completes calibration and returns calibrated thresholds.
   * If samples are insufficient, gracefully falls back to system defaults.
   */
  public finish(): CalibratedThresholds {
    const minSamples = this.config.calibration.minValidSamples;

    if (this.samples.length < minSamples) {
      return this.skip(
        `Insufficient valid samples collected (${this.samples.length}/${minSamples})`
      );
    }

    const ears = this.samples.map((s) => s.ear);
    const mars = this.samples.map((s) => s.mar);

    const baselineEAR = computeRobustBaseline(
      ears,
      this.config.calibration.outlierMadMultiplier,
      this.config.calibration.defaultEar
    );

    const baselineMAR = computeRobustBaseline(
      mars,
      this.config.calibration.outlierMadMultiplier,
      this.config.calibration.defaultMar
    );

    return deriveCalibratedThresholds(
      baselineEAR,
      baselineMAR,
      false,
      this.samples.length,
      this.config
    );
  }

  /**
   * Skips calibration and returns default baseline configuration with notice.
   */
  public skip(reason: string = "Calibration skipped by user"): CalibratedThresholds {
    const { defaultEar, defaultMar } = this.config.calibration;

    return deriveCalibratedThresholds(
      defaultEar,
      defaultMar,
      true,
      this.samples.length,
      this.config,
      reason
    );
  }
}
