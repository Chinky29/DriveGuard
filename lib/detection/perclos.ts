/**
 * DriveGuard Temporal Metrics & PERCLOS Engine
 *
 * Implements Rule 5 (Pure Mathematical Functions & Testability):
 * - 60s sliding-window PERCLOS
 * - Blink detection (closure duration 100-400 ms)
 * - Blink rate per minute
 * - Microsleep detection (closure above 1.0 s)
 * - Yawn counter (MAR above threshold for sustained duration)
 * - Nod detector (sustained pitch drop)
 * - Rule 2 (Reliability Guard): Safely pauses/resets accumulators on missing/unreliable face
 *
 * Strictly zero React, zero DOM dependencies.
 */

import { DEFAULT_CONFIG, DriveGuardConfig } from "./config";

export interface FrameObservation {
  readonly timestamp: number; // in seconds
  readonly ear: number;
  readonly mar: number;
  readonly pitch: number;
  readonly isFaceReliable: boolean;
}

export interface TemporalMetricsSnapshot {
  readonly timestamp: number;
  readonly isFaceReliable: boolean;
  readonly perclos: number; // 0.0 to 1.0 (proportion of eye closure in sliding window)
  readonly eyeClosureDuration: number; // Current continuous eye closure duration (s)
  readonly isEyeClosed: boolean;
  readonly isBlink: boolean; // True on the exact frame a normal blink completes
  readonly blinkCount: number;
  readonly blinkRatePerMinute: number;
  readonly isMicrosleep: boolean; // Currently in microsleep (closure >= 1.0s)
  readonly microsleepCount: number;
  readonly yawnDuration: number; // Current continuous mouth open duration (s)
  readonly isYawning: boolean; // Currently in sustained yawn
  readonly yawnCount: number;
  readonly nodDuration: number; // Current continuous downward pitch duration (s)
  readonly isNodding: boolean; // Currently in sustained nod
  readonly nodCount: number;
}

/**
 * Pure evaluation: checks if an eye closure duration qualifies as a normal blink.
 */
export function isBlinkDuration(
  durationSeconds: number,
  minDurationSeconds: number = DEFAULT_CONFIG.blink.minBlinkDurationSeconds,
  maxDurationSeconds: number = DEFAULT_CONFIG.blink.maxBlinkDurationSeconds
): boolean {
  return durationSeconds >= minDurationSeconds && durationSeconds <= maxDurationSeconds;
}

/**
 * Pure evaluation: checks if an eye closure duration qualifies as a microsleep.
 */
export function isMicrosleepDuration(
  durationSeconds: number,
  thresholdSeconds: number = DEFAULT_CONFIG.blink.microsleepDurationSeconds
): boolean {
  return durationSeconds >= thresholdSeconds;
}

/**
 * Pure evaluation: checks if mouth opening duration qualifies as a yawn.
 */
export function isYawnDuration(
  durationSeconds: number,
  thresholdSeconds: number = DEFAULT_CONFIG.mar.yawnDurationSeconds
): boolean {
  return durationSeconds >= thresholdSeconds;
}

/**
 * Pure evaluation: checks if pitch drop and duration qualify as a head nod.
 */
export function isNodEvent(
  pitchDegrees: number,
  durationSeconds: number,
  pitchThresholdDegrees: number = DEFAULT_CONFIG.nod.pitchDropThresholdDegrees,
  durationThresholdSeconds: number = DEFAULT_CONFIG.nod.sustainedDurationSeconds
): boolean {
  return pitchDegrees <= pitchThresholdDegrees && durationSeconds >= durationThresholdSeconds;
}

/**
 * Pure calculation: computes PERCLOS from a slice of timestamped closure samples.
 */
export function calculateSlidingWindowPerclos(
  samples: readonly { timestamp: number; isClosed: boolean }[],
  windowSeconds: number,
  currentTime: number
): number {
  if (samples.length === 0 || windowSeconds <= 0) return 0.0;

  const windowStart = currentTime - windowSeconds;
  const validSamples = samples.filter((s) => s.timestamp >= windowStart && s.timestamp <= currentTime);

  if (validSamples.length === 0) return 0.0;

  const closedCount = validSamples.filter((s) => s.isClosed).length;
  return closedCount / validSamples.length;
}

/**
 * Stateful Temporal Metrics Tracker for real-time video evaluation.
 */
export class DriverMetricsTracker {
  private config: DriveGuardConfig;

  // Windowed closure history for PERCLOS
  private closureHistory: Array<{ timestamp: number; isClosed: boolean }> = [];

  // Blink tracking
  private isEyeCurrentlyClosed: boolean = false;
  private eyeClosedStartTime: number | null = null;
  private currentClosureDuration: number = 0;
  private blinkTimestamps: number[] = [];
  private totalBlinkCount: number = 0;

  // Microsleep tracking
  private isCurrentlyInMicrosleep: boolean = false;
  private hasCountedCurrentMicrosleep: boolean = false;
  private totalMicrosleepCount: number = 0;

  // Yawn tracking
  private isMouthCurrentlyOpen: boolean = false;
  private mouthOpenStartTime: number | null = null;
  private currentYawnDuration: number = 0;
  private isCurrentlyYawning: boolean = false;
  private hasCountedCurrentYawn: boolean = false;
  private totalYawnCount: number = 0;

  // Head nod tracking
  private isHeadCurrentlyDown: boolean = false;
  private headDownStartTime: number | null = null;
  private currentNodDuration: number = 0;
  private isCurrentlyNodding: boolean = false;
  private hasCountedCurrentNod: boolean = false;
  private totalNodCount: number = 0;

  private lastObservationTime: number | null = null;

  constructor(config: DriveGuardConfig = DEFAULT_CONFIG) {
    this.config = config;
  }

  /**
   * Resets all running continuous state accumulators (Rule 2).
   */
  public resetContinuousAccumulators(): void {
    this.isEyeCurrentlyClosed = false;
    this.eyeClosedStartTime = null;
    this.currentClosureDuration = 0;
    this.isCurrentlyInMicrosleep = false;
    this.hasCountedCurrentMicrosleep = false;

    this.isMouthCurrentlyOpen = false;
    this.mouthOpenStartTime = null;
    this.currentYawnDuration = 0;
    this.isCurrentlyYawning = false;
    this.hasCountedCurrentYawn = false;

    this.isHeadCurrentlyDown = false;
    this.headDownStartTime = null;
    this.currentNodDuration = 0;
    this.isCurrentlyNodding = false;
    this.hasCountedCurrentNod = false;
  }

  /**
   * Processes a new frame observation and returns updated temporal metrics.
   */
  public update(obs: FrameObservation): TemporalMetricsSnapshot {
    const now = obs.timestamp;
    let justCompletedBlink = false;

    // Rule 2: If face is missing or low-confidence, pause and safely reset continuous accumulators
    if (!obs.isFaceReliable) {
      this.resetContinuousAccumulators();
      this.lastObservationTime = now;

      const perclos = this.computePerclos(now);
      const blinkRate = this.computeBlinkRate(now);

      return {
        timestamp: now,
        isFaceReliable: false,
        perclos,
        eyeClosureDuration: 0.0,
        isEyeClosed: false,
        isBlink: false,
        blinkCount: this.totalBlinkCount,
        blinkRatePerMinute: blinkRate,
        isMicrosleep: false,
        microsleepCount: this.totalMicrosleepCount,
        yawnDuration: 0.0,
        isYawning: false,
        yawnCount: this.totalYawnCount,
        nodDuration: 0.0,
        isNodding: false,
        nodCount: this.totalNodCount,
      };
    }

    // 1. Eye closure & Blink evaluation
    const isClosedThreshold = obs.ear < this.config.ear.lowThreshold;
    const isReopenedThreshold = obs.ear >= this.config.ear.reopenThreshold;

    if (!this.isEyeCurrentlyClosed) {
      if (isClosedThreshold) {
        this.isEyeCurrentlyClosed = true;
        this.eyeClosedStartTime = now;
        this.currentClosureDuration = 0.0;
        this.hasCountedCurrentMicrosleep = false;
      }
    } else {
      if (isReopenedThreshold) {
        // Eye just reopened! Check closure duration
        const duration = this.eyeClosedStartTime !== null ? now - this.eyeClosedStartTime : 0.0;

        // If duration falls within normal blink bounds and was not a microsleep
        if (
          isBlinkDuration(
            duration,
            this.config.blink.minBlinkDurationSeconds,
            this.config.blink.maxBlinkDurationSeconds
          ) &&
          !this.hasCountedCurrentMicrosleep
        ) {
          this.totalBlinkCount++;
          this.blinkTimestamps.push(now);
          justCompletedBlink = true;
        }

        this.isEyeCurrentlyClosed = false;
        this.eyeClosedStartTime = null;
        this.currentClosureDuration = 0.0;
        this.isCurrentlyInMicrosleep = false;
        this.hasCountedCurrentMicrosleep = false;
      } else {
        // Eye remains closed
        if (this.eyeClosedStartTime !== null) {
          this.currentClosureDuration = now - this.eyeClosedStartTime;
        }

        // Check for microsleep (closure above 1.0s)
        if (
          isMicrosleepDuration(
            this.currentClosureDuration,
            this.config.blink.microsleepDurationSeconds
          )
        ) {
          this.isCurrentlyInMicrosleep = true;
          if (!this.hasCountedCurrentMicrosleep) {
            this.totalMicrosleepCount++;
            this.hasCountedCurrentMicrosleep = true;
          }
        }
      }
    }

    // Record sample in sliding window for PERCLOS
    this.closureHistory.push({ timestamp: now, isClosed: this.isEyeCurrentlyClosed });

    // 2. Yawn evaluation (MAR above threshold for sustained duration)
    const isMouthOpen = obs.mar >= this.config.mar.openThreshold;

    if (!this.isMouthCurrentlyOpen) {
      if (isMouthOpen) {
        this.isMouthCurrentlyOpen = true;
        this.mouthOpenStartTime = now;
        this.currentYawnDuration = 0.0;
        this.hasCountedCurrentYawn = false;
      }
    } else {
      if (!isMouthOpen) {
        // Mouth closed
        this.isMouthCurrentlyOpen = false;
        this.mouthOpenStartTime = null;
        this.currentYawnDuration = 0.0;
        this.isCurrentlyYawning = false;
        this.hasCountedCurrentYawn = false;
      } else {
        // Mouth remains open
        if (this.mouthOpenStartTime !== null) {
          this.currentYawnDuration = now - this.mouthOpenStartTime;
        }

        if (isYawnDuration(this.currentYawnDuration, this.config.mar.yawnDurationSeconds)) {
          this.isCurrentlyYawning = true;
          if (!this.hasCountedCurrentYawn) {
            this.totalYawnCount++;
            this.hasCountedCurrentYawn = true;
          }
        }
      }
    }

    // 3. Head nod evaluation (sustained pitch drop)
    const isPitchDropped = obs.pitch <= this.config.nod.pitchDropThresholdDegrees;

    if (!this.isHeadCurrentlyDown) {
      if (isPitchDropped) {
        this.isHeadCurrentlyDown = true;
        this.headDownStartTime = now;
        this.currentNodDuration = 0.0;
        this.hasCountedCurrentNod = false;
      }
    } else {
      if (!isPitchDropped) {
        // Head returned to normal pitch
        this.isHeadCurrentlyDown = false;
        this.headDownStartTime = null;
        this.currentNodDuration = 0.0;
        this.isCurrentlyNodding = false;
        this.hasCountedCurrentNod = false;
      } else {
        // Head remains pitched down
        if (this.headDownStartTime !== null) {
          this.currentNodDuration = now - this.headDownStartTime;
        }

        if (
          isNodEvent(
            obs.pitch,
            this.currentNodDuration,
            this.config.nod.pitchDropThresholdDegrees,
            this.config.nod.sustainedDurationSeconds
          )
        ) {
          this.isCurrentlyNodding = true;
          if (!this.hasCountedCurrentNod) {
            this.totalNodCount++;
            this.hasCountedCurrentNod = true;
          }
        }
      }
    }

    this.lastObservationTime = now;
    const perclos = this.computePerclos(now);
    const blinkRate = this.computeBlinkRate(now);

    return {
      timestamp: now,
      isFaceReliable: true,
      perclos,
      eyeClosureDuration: this.currentClosureDuration,
      isEyeClosed: this.isEyeCurrentlyClosed,
      isBlink: justCompletedBlink,
      blinkCount: this.totalBlinkCount,
      blinkRatePerMinute: blinkRate,
      isMicrosleep: this.isCurrentlyInMicrosleep,
      microsleepCount: this.totalMicrosleepCount,
      yawnDuration: this.currentYawnDuration,
      isYawning: this.isCurrentlyYawning,
      yawnCount: this.totalYawnCount,
      nodDuration: this.currentNodDuration,
      isNodding: this.isCurrentlyNodding,
      nodCount: this.totalNodCount,
    };
  }

  private computePerclos(now: number): number {
    const windowStart = now - this.config.perclos.windowSeconds;

    // Prune old entries
    while (this.closureHistory.length > 0 && this.closureHistory[0].timestamp < windowStart) {
      this.closureHistory.shift();
    }

    if (this.closureHistory.length === 0) return 0.0;

    const closedSamples = this.closureHistory.filter((s) => s.isClosed).length;
    return closedSamples / this.closureHistory.length;
  }

  private computeBlinkRate(now: number): number {
    const windowStart = now - this.config.blink.rateWindowSeconds;

    // Prune old blink timestamps
    while (this.blinkTimestamps.length > 0 && this.blinkTimestamps[0] < windowStart) {
      this.blinkTimestamps.shift();
    }

    // Rate in blinks per minute
    if (this.closureHistory.length === 0) return 0.0;
    const oldest = this.closureHistory[0].timestamp;
    const activeSpanSeconds = Math.max(1.0, Math.min(this.config.blink.rateWindowSeconds, now - oldest));

    return (this.blinkTimestamps.length / activeSpanSeconds) * 60.0;
  }
}
