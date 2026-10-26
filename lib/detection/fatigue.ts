/**
 * DriveGuard Multi-Modal Fused Fatigue Engine
 *
 * Implements:
 * - Fused fatigue score (0–100) combining PERCLOS, blink duration, yawn rate,
 *   head nodding, and microsleep events using typed weights from config.ts.
 * - Temporal hysteresis: Raising alert level requires a sustained condition;
 *   dropping level requires recovery time.
 * - Rule 1 (Neutral Advisory Phrasing): Observable physiological explanations only.
 * - Rule 2 (Reliability Guard): Refuses decisions when face is lost.
 *
 * Strictly zero React, zero DOM dependencies.
 */

import { DEFAULT_CONFIG, DriveGuardConfig } from "./config";

export type FatigueLevel = "Normal" | "Notice" | "Warning" | "Critical";

export interface FatigueSignals {
  readonly timestamp: number; // in seconds
  readonly isFaceReliable: boolean;
  readonly perclos: number; // 0.0 to 1.0 (proportion over 60s)
  readonly blinkDurationSeconds: number; // Current eye closure or recent blink duration (s)
  readonly yawnRatePerMinute: number; // Yawns per minute or recent yawn count
  readonly isYawning: boolean;
  readonly nodCount: number; // Head nods in window
  readonly isNodding: boolean;
  readonly microsleepCount: number;
  readonly isMicrosleep: boolean;
}

export interface FatigueComponentScores {
  readonly perclosScore: number; // 0-100
  readonly microsleepScore: number; // 0-100
  readonly yawnScore: number; // 0-100
  readonly nodScore: number; // 0-100
  readonly blinkDurationScore: number; // 0-100
}

export interface FatigueAssessment {
  readonly score: number; // 0 to 100
  readonly level: FatigueLevel;
  readonly rawLevel: FatigueLevel;
  readonly reasons: readonly string[];
  readonly components: FatigueComponentScores;
  readonly timestamp: number;
  readonly isFaceReliable: boolean;
}

const LEVEL_RANK: Record<FatigueLevel, number> = {
  Normal: 0,
  Notice: 1,
  Warning: 2,
  Critical: 3,
};

const RANK_TO_LEVEL: Record<number, FatigueLevel> = {
  0: "Normal",
  1: "Notice",
  2: "Warning",
  3: "Critical",
};

/**
 * Pure function to compute individual fatigue component scores (0–100).
 */
export function computeComponentScores(signals: FatigueSignals): FatigueComponentScores {
  // 1. PERCLOS score: nominal <= 0.05, notice >= 0.15, warning >= 0.25, critical >= 0.35
  const perclosClamped = Math.max(0.0, Math.min(1.0, signals.perclos));
  const perclosScore = Math.min(100, Math.round((perclosClamped / 0.35) * 100));

  // 2. Microsleep score: actively in microsleep = 100, or cumulative count
  let microsleepScore = 0;
  if (signals.isMicrosleep) {
    microsleepScore = 100;
  } else if (signals.microsleepCount > 0) {
    microsleepScore = Math.min(100, signals.microsleepCount * 50);
  }

  // 3. Yawn score: actively yawning = 85, or rate-based
  let yawnScore = 0;
  if (signals.isYawning) {
    yawnScore = 85;
  } else if (signals.yawnRatePerMinute >= 2.0) {
    yawnScore = 80;
  } else if (signals.yawnRatePerMinute >= 1.0) {
    yawnScore = 50;
  }

  // 4. Nod score: actively nodding = 90, or count-based
  let nodScore = 0;
  if (signals.isNodding) {
    nodScore = 90;
  } else if (signals.nodCount >= 2) {
    nodScore = 75;
  } else if (signals.nodCount >= 1) {
    nodScore = 45;
  }

  // 5. Blink duration score: sluggish blinks between 0.40s and 1.0s
  let blinkDurationScore = 0;
  if (signals.blinkDurationSeconds >= 0.40) {
    const sluggishSpan = Math.min(1.0, signals.blinkDurationSeconds) - 0.40;
    blinkDurationScore = Math.min(100, Math.round((sluggishSpan / 0.60) * 100));
  }

  return {
    perclosScore,
    microsleepScore,
    yawnScore,
    nodScore,
    blinkDurationScore,
  };
}

/**
 * Computes fused raw score (0-100) using weights defined in config.
 */
export function computeFusedFatigueScore(
  components: FatigueComponentScores,
  config: DriveGuardConfig = DEFAULT_CONFIG
): number {
  const { fatigueWeights: w } = config;

  const rawScore =
    components.perclosScore * w.perclos +
    components.microsleepScore * w.microsleep +
    components.yawnScore * w.yawn +
    components.nodScore * w.nod +
    components.blinkDurationScore * w.blinkDuration;

  return Math.max(0, Math.min(100, Math.round(rawScore)));
}

/**
 * Determines raw fatigue level from fused score without hysteresis.
 */
export function getRawFatigueLevel(
  score: number,
  config: DriveGuardConfig = DEFAULT_CONFIG
): FatigueLevel {
  const { fatigueThresholds: th } = config;

  if (score >= th.criticalScore) return "Critical";
  if (score >= th.warningScore) return "Warning";
  if (score >= th.noticeScore) return "Notice";
  return "Normal";
}

/**
 * Constructs neutral physiological explanation reasons from active components (Rule 1).
 */
export function extractFatigueReasons(
  components: FatigueComponentScores,
  rawScore: number,
  config: DriveGuardConfig = DEFAULT_CONFIG
): string[] {
  const reasons: string[] = [];

  if (components.microsleepScore >= 40) {
    reasons.push("microsleep event detected");
  }
  if (components.perclosScore >= 40) {
    reasons.push("high eye closure proportion (PERCLOS)");
  }
  if (components.nodScore >= 40) {
    reasons.push("sustained downward head nodding");
  }
  if (components.yawnScore >= 40) {
    reasons.push("frequent or prolonged yawning");
  }
  if (components.blinkDurationScore >= 40) {
    reasons.push("elevated blink closure duration");
  }

  if (reasons.length === 0) {
    if (rawScore >= config.fatigueThresholds.noticeScore) {
      reasons.push("combined mild fatigue indicators");
    } else {
      reasons.push("Nominal - attentive");
    }
  }

  return reasons;
}

/**
 * Stateful Multi-Modal Fatigue Tracker with Hysteresis Smoothing
 */
export class FusedFatigueTracker {
  private config: DriveGuardConfig;
  private currentLevel: FatigueLevel = "Normal";

  // Escalation tracking: raising level needs sustained condition
  private pendingEscalationLevel: FatigueLevel | null = null;
  private escalationStartTime: number | null = null;

  // De-escalation tracking: dropping level needs recovery time
  private pendingDeescalationLevel: FatigueLevel | null = null;
  private deescalationStartTime: number | null = null;

  constructor(config: DriveGuardConfig = DEFAULT_CONFIG) {
    this.config = config;
  }

  /**
   * Resets temporal hysteresis state.
   */
  public reset(): void {
    this.currentLevel = "Normal";
    this.pendingEscalationLevel = null;
    this.escalationStartTime = null;
    this.pendingDeescalationLevel = null;
    this.deescalationStartTime = null;
  }

  /**
   * Evaluates incoming frame signals and applies temporal hysteresis.
   */
  public update(signals: FatigueSignals): FatigueAssessment {
    const now = signals.timestamp;

    // Rule 2: If face is not reliable, pause decisions and reset hysteresis
    if (!signals.isFaceReliable) {
      this.reset();
      return {
        score: 0,
        level: "Normal",
        rawLevel: "Normal",
        reasons: [this.config.reliability.unreliableReason],
        components: {
          perclosScore: 0,
          microsleepScore: 0,
          yawnScore: 0,
          nodScore: 0,
          blinkDurationScore: 0,
        },
        timestamp: now,
        isFaceReliable: false,
      };
    }

    const components = computeComponentScores(signals);
    const score = computeFusedFatigueScore(components, this.config);
    const rawLevel = getRawFatigueLevel(score, this.config);
    const reasons = extractFatigueReasons(components, score, this.config);

    const currentRank = LEVEL_RANK[this.currentLevel];
    const rawRank = LEVEL_RANK[rawLevel];

    const { escalationSustainSeconds, deescalationRecoverySeconds } =
      this.config.fatigueThresholds;

    // 1. Escalation Condition: rawRank > currentRank
    if (rawRank > currentRank) {
      // Reset any active de-escalation
      this.pendingDeescalationLevel = null;
      this.deescalationStartTime = null;

      if (this.pendingEscalationLevel !== rawLevel) {
        this.pendingEscalationLevel = rawLevel;
        this.escalationStartTime = now;
      } else if (this.escalationStartTime !== null) {
        const sustainedDuration = now - this.escalationStartTime;
        if (sustainedDuration >= escalationSustainSeconds) {
          this.currentLevel = rawLevel;
          this.pendingEscalationLevel = null;
          this.escalationStartTime = null;
        }
      }
    }
    // 2. De-escalation Condition: rawRank < currentRank
    else if (rawRank < currentRank) {
      // Reset any active escalation
      this.pendingEscalationLevel = null;
      this.escalationStartTime = null;

      if (this.pendingDeescalationLevel !== rawLevel) {
        this.pendingDeescalationLevel = rawLevel;
        this.deescalationStartTime = now;
      } else if (this.deescalationStartTime !== null) {
        const recoveryDuration = now - this.deescalationStartTime;
        if (recoveryDuration >= deescalationRecoverySeconds) {
          this.currentLevel = rawLevel;
          this.pendingDeescalationLevel = null;
          this.deescalationStartTime = null;
        }
      }
    }
    // 3. Equilibrium: rawRank == currentRank
    else {
      this.pendingEscalationLevel = null;
      this.escalationStartTime = null;
      this.pendingDeescalationLevel = null;
      this.deescalationStartTime = null;
    }

    return {
      score,
      level: this.currentLevel,
      rawLevel,
      reasons,
      components,
      timestamp: now,
      isFaceReliable: true,
    };
  }

  /**
   * Returns current smoothed fatigue level.
   */
  public getCurrentLevel(): FatigueLevel {
    return this.currentLevel;
  }
}
