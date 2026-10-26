import { AdvisoryLevel, AdvisoryReason } from "@/lib/types";
import { DEFAULT_CONFIG, DriveGuardConfig } from "./config";

export interface FusionInputs {
  readonly timestamp: number;
  readonly faceReliable: boolean;
  readonly eyeClosureDuration: number;
  readonly perclos: number | null;
  readonly headDeviationDuration: number;
}

export interface FusionDecision {
  readonly level: AdvisoryLevel;
  readonly reason: AdvisoryReason | string;
}

/**
 * Evaluates multi-modal driver metrics into graded advisory decisions.
 *
 * Implements:
 * - Rule 1 (Neutral Advisory Phrasing): Only observable physical descriptions.
 * - Rule 2 (Face Reliability Guard): UNKNOWN when face is not reliable.
 */
export function evaluateTemporalFusion(
  inputs: FusionInputs,
  config: DriveGuardConfig = DEFAULT_CONFIG
): FusionDecision {
  // Rule 2: Face reliability guard
  if (!inputs.faceReliable) {
    return {
      level: AdvisoryLevel.UNKNOWN,
      reason: config.reliability.unreliableReason,
    };
  }

  const { eyeClosureDuration, headDeviationDuration, perclos } = inputs;
  const { temporalFusion: tf, perclos: pc } = config;

  const isEyeWarning = eyeClosureDuration >= tf.eyeClosureWarningSeconds;
  const isEyeNotice = eyeClosureDuration >= tf.eyeClosureNoticeSeconds;

  const isHeadWarning = headDeviationDuration >= tf.headDeviationWarningSeconds;
  const isHeadNotice = headDeviationDuration >= tf.headDeviationNoticeSeconds;

  const isPerclosWarning = perclos !== null && perclos >= pc.warningThreshold;
  const isPerclosNotice = perclos !== null && perclos >= pc.noticeThreshold;

  // Dual condition: Combined head deviation and eye closure
  if (isEyeWarning && isHeadWarning) {
    return {
      level: AdvisoryLevel.WARNING,
      reason: "sustained head deviation and eye closure",
    };
  }

  // Warning level
  if (isEyeWarning) {
    return {
      level: AdvisoryLevel.WARNING,
      reason: "prolonged eye closure",
    };
  }
  if (isHeadWarning) {
    return {
      level: AdvisoryLevel.WARNING,
      reason: "sustained head deviation",
    };
  }
  if (isPerclosWarning) {
    return {
      level: AdvisoryLevel.WARNING,
      reason: "high eye closure proportion",
    };
  }

  // Notice level
  if (isEyeNotice && isHeadNotice) {
    return {
      level: AdvisoryLevel.NOTICE,
      reason: "sustained head deviation and eye closure",
    };
  }
  if (isEyeNotice) {
    return {
      level: AdvisoryLevel.NOTICE,
      reason: "prolonged eye closure",
    };
  }
  if (isHeadNotice) {
    return {
      level: AdvisoryLevel.NOTICE,
      reason: "sustained head deviation",
    };
  }
  if (isPerclosNotice) {
    return {
      level: AdvisoryLevel.NOTICE,
      reason: "high eye closure proportion",
    };
  }

  return {
    level: AdvisoryLevel.NORMAL,
    reason: "Attentive - Nominal",
  };
}
