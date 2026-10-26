/**
 * DriveGuard Detection Pipeline Configuration
 *
 * Implements Rule 4 (Zero Magic Numbers): All thresholds, landmark indices,
 * time windows, and hysteresis parameters are strictly declared here with
 * full type safety and documentation.
 */

export interface EarConfig {
  /** EAR below this value indicates eye closure */
  readonly lowThreshold: number;
  /** EAR below this value indicates deep eye closure */
  readonly veryLowThreshold: number;
  /** EAR must rise above this threshold to count as fully reopened (hysteresis) */
  readonly reopenThreshold: number;
}

export interface MarConfig {
  /** MAR above this value indicates mouth opening */
  readonly openThreshold: number;
  /** Continuous mouth opening duration in seconds to count as a yawn */
  readonly yawnDurationSeconds: number;
}

export interface BlinkConfig {
  /** Minimum eye closure duration for a normal blink (seconds: 0.10s / 100ms) */
  readonly minBlinkDurationSeconds: number;
  /** Maximum eye closure duration for a normal blink (seconds: 0.40s / 400ms) */
  readonly maxBlinkDurationSeconds: number;
  /** Eye closure duration exceeding this indicates microsleep (seconds: 1.0s) */
  readonly microsleepDurationSeconds: number;
  /** Time window in seconds for computing blinks per minute */
  readonly rateWindowSeconds: number;
}

export interface NodConfig {
  /** Downward pitch angle (degrees, negative) to indicate head nod */
  readonly pitchDropThresholdDegrees: number;
  /** Continuous pitch drop duration in seconds to trigger nod count */
  readonly sustainedDurationSeconds: number;
}

export interface PerclosConfig {
  /** Sliding time window duration in seconds (standard: 60.0s) */
  readonly windowSeconds: number;
  /** Proportion of eye closure time triggering an advisory notice (e.g. 15%) */
  readonly noticeThreshold: number;
  /** Proportion of eye closure time triggering an advisory warning (e.g. 25%) */
  readonly warningThreshold: number;
  /** Minimum data history in seconds before PERCLOS decisions are active */
  readonly minHistorySeconds: number;
}

export interface HeadPoseConfig {
  /** Sustained yaw deviation (horizontal turn) triggering advisory notice (degrees) */
  readonly yawNoticeDegrees: number;
  /** Sustained yaw deviation triggering advisory warning (degrees) */
  readonly yawWarningDegrees: number;
  /** Sustained pitch deviation (downward nod) triggering advisory notice (degrees) */
  readonly pitchNoticeDegrees: number;
  /** Sustained pitch deviation triggering advisory warning (degrees) */
  readonly pitchWarningDegrees: number;
}

export interface TemporalFusionConfig {
  /** Continuous eye closure duration in seconds to trigger NOTICE */
  readonly eyeClosureNoticeSeconds: number;
  /** Continuous eye closure duration in seconds to trigger WARNING */
  readonly eyeClosureWarningSeconds: number;
  /** Continuous head deviation duration in seconds to trigger NOTICE */
  readonly headDeviationNoticeSeconds: number;
  /** Continuous head deviation duration in seconds to trigger WARNING */
  readonly headDeviationWarningSeconds: number;
  /** Minimum quiet interval in seconds before alert level can drop or re-arm */
  readonly cooldownSeconds: number;
}

export interface LandmarkIndexConfig {
  /** MediaPipe FaceMesh landmark indices for the left eye: [P1, P2, P3, P4, P5, P6] */
  readonly leftEye: readonly [number, number, number, number, number, number];
  /** MediaPipe FaceMesh landmark indices for the right eye: [P1, P2, P3, P4, P5, P6] */
  readonly rightEye: readonly [number, number, number, number, number, number];
  /** MediaPipe FaceMesh landmark indices for the mouth */
  readonly mouth: {
    readonly leftCorner: number;
    readonly rightCorner: number;
    readonly upperInner: number;
    readonly lowerInner: number;
    readonly upperOuter: number;
    readonly lowerOuter: number;
  };
  /** 6-point anthropometric facial anchors for Perspective-n-Point pose estimation */
  readonly headPoseAnchors: {
    readonly noseTip: number;
    readonly chin: number;
    readonly leftEyeOuter: number;
    readonly rightEyeOuter: number;
    readonly leftMouthCorner: number;
    readonly rightMouthCorner: number;
  };
}

export interface ReliabilityConfig {
  /** Minimum landmark points required to consider face reliably detected */
  readonly minLandmarksRequired: number;
  /** Mandatory advisory text when tracking is lost or confidence drops (Rule 2) */
  readonly unreliableReason: string;
}

export interface CalibrationConfig {
  /** Total calibration duration in seconds (20 seconds) */
  readonly durationSeconds: number;
  /** Minimum valid frames required to calculate personalized baseline */
  readonly minValidSamples: number;
  /** Median Absolute Deviation multiplier for outlier filtering */
  readonly outlierMadMultiplier: number;
  /** Default fallback baseline EAR if calibration is skipped */
  readonly defaultEar: number;
  /** Default fallback baseline MAR if calibration is skipped */
  readonly defaultMar: number;
  /** Ratio of baseline EAR to set eye closure threshold (e.g. 0.70 of baseline) */
  readonly earLowRatio: number;
  /** Ratio of baseline MAR to set mouth opening threshold (e.g. 2.5 of baseline) */
  readonly marOpenRatio: number;
}

export interface FatigueWeightsConfig {
  /** Weight for PERCLOS (0.0 - 1.0) */
  readonly perclos: number;
  /** Weight for microsleep events (0.0 - 1.0) */
  readonly microsleep: number;
  /** Weight for yawning activity (0.0 - 1.0) */
  readonly yawn: number;
  /** Weight for head nodding (0.0 - 1.0) */
  readonly nod: number;
  /** Weight for blink duration (0.0 - 1.0) */
  readonly blinkDuration: number;
}

export interface FatigueScoreThresholdsConfig {
  /** Fused score (0-100) triggering Notice level */
  readonly noticeScore: number;
  /** Fused score (0-100) triggering Warning level */
  readonly warningScore: number;
  /** Fused score (0-100) triggering Critical level */
  readonly criticalScore: number;
  /** Continuous sustain duration in seconds required to escalate to higher level */
  readonly escalationSustainSeconds: number;
  /** Continuous recovery duration in seconds required to de-escalate to lower level */
  readonly deescalationRecoverySeconds: number;
}

export interface AlertsConfig {
  /** Anti-spam cooldown intervals in seconds per alert level */
  readonly cooldownSeconds: {
    readonly notice: number;
    readonly warning: number;
    readonly critical: number;
  };
  /** Timeout in seconds before missing face escalates to advisory alert */
  readonly faceLostTimeoutSeconds: number;
  /** Vibration patterns in milliseconds for navigator.vibrate */
  readonly vibratePatterns: {
    readonly notice: readonly number[];
    readonly warning: readonly number[];
    readonly critical: readonly number[];
  };
  /** Audio tone frequencies in Hertz for synthesized chimes */
  readonly toneFrequencies: {
    readonly notice: number;
    readonly warning: number;
    readonly critical: number;
  };
}

export interface DriveGuardConfig {
  readonly ear: EarConfig;
  readonly mar: MarConfig;
  readonly blink: BlinkConfig;
  readonly nod: NodConfig;
  readonly perclos: PerclosConfig;
  readonly headPose: HeadPoseConfig;
  readonly temporalFusion: TemporalFusionConfig;
  readonly landmarks: LandmarkIndexConfig;
  readonly reliability: ReliabilityConfig;
  readonly calibration: CalibrationConfig;
  readonly fatigueWeights: FatigueWeightsConfig;
  readonly fatigueThresholds: FatigueScoreThresholdsConfig;
  readonly alerts: AlertsConfig;
}

/**
 * Default calibrated configuration matching config.yaml
 */
export const DEFAULT_CONFIG: DriveGuardConfig = {
  ear: {
    lowThreshold: 0.21,
    veryLowThreshold: 0.16,
    reopenThreshold: 0.23,
  },
  mar: {
    openThreshold: 0.55,
    yawnDurationSeconds: 1.5,
  },
  blink: {
    minBlinkDurationSeconds: 0.10, // 100 ms
    maxBlinkDurationSeconds: 0.40, // 400 ms
    microsleepDurationSeconds: 1.0, // > 1.0 s
    rateWindowSeconds: 60.0,
  },
  nod: {
    pitchDropThresholdDegrees: -12.0, // Downward pitch <= -12°
    sustainedDurationSeconds: 0.8,
  },
  perclos: {
    windowSeconds: 60.0,
    noticeThreshold: 0.15,
    warningThreshold: 0.25,
    minHistorySeconds: 10.0,
  },
  headPose: {
    yawNoticeDegrees: 20.0,
    yawWarningDegrees: 25.0,
    pitchNoticeDegrees: 15.0,
    pitchWarningDegrees: 18.0,
  },
  temporalFusion: {
    eyeClosureNoticeSeconds: 1.0,
    eyeClosureWarningSeconds: 1.8,
    headDeviationNoticeSeconds: 1.5,
    headDeviationWarningSeconds: 2.5,
    cooldownSeconds: 2.0,
  },
  landmarks: {
    leftEye: [33, 160, 158, 133, 153, 144],
    rightEye: [362, 385, 387, 263, 373, 380],
    mouth: {
      leftCorner: 61,
      rightCorner: 291,
      upperInner: 13,
      lowerInner: 14,
      upperOuter: 0,
      lowerOuter: 17,
    },
    headPoseAnchors: {
      noseTip: 1,
      chin: 152,
      leftEyeOuter: 33,
      rightEyeOuter: 263,
      leftMouthCorner: 61,
      rightMouthCorner: 291,
    },
  },
  reliability: {
    minLandmarksRequired: 468,
    unreliableReason: "Face not reliably detected",
  },
  calibration: {
    durationSeconds: 20.0,
    minValidSamples: 60,
    outlierMadMultiplier: 2.5,
    defaultEar: 0.30,
    defaultMar: 0.15,
    earLowRatio: 0.70,
    marOpenRatio: 2.5,
  },
  fatigueWeights: {
    perclos: 0.35,
    microsleep: 0.25,
    yawn: 0.15,
    nod: 0.15,
    blinkDuration: 0.10,
  },
  fatigueThresholds: {
    noticeScore: 40.0,
    warningScore: 65.0,
    criticalScore: 85.0,
    escalationSustainSeconds: 1.5,
    deescalationRecoverySeconds: 3.0,
  },
  alerts: {
    cooldownSeconds: {
      notice: 6.0,
      warning: 4.0,
      critical: 2.0,
    },
    faceLostTimeoutSeconds: 5.0,
    vibratePatterns: {
      notice: [200],
      warning: [200, 100, 200],
      critical: [300, 100, 300, 100, 500],
    },
    toneFrequencies: {
      notice: 440,
      warning: 660,
      critical: 880,
    },
  },
} as const;

