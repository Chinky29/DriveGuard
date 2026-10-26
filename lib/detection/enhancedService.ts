/**
 * DriveGuard Enhanced ML Client & Weak Signal Merger
 *
 * Implements optional client-side communication with the Flask ML microservice.
 *
 * Rules:
 * - Only active when driver explicitly enables Enhanced Mode in Settings.
 * - Dispatches a small cropped thumbnail every 2.0 seconds.
 * - Evaluates asynchronously with a strict non-blocking timeout.
 * - Merges results as an extra WEAK signal into the fusion score (max 8 points out of 100).
 * - Graceful fallback: If service is offline or slow, detection continues purely on-device.
 */

import { FatigueAssessment } from "./fatigue";

export interface EnhancedPredictionResult {
  closedProbability?: number;
  openProbability?: number;
  dominantEmotion?: string;
  isAvailable: boolean;
  scoreAdjustment: number;
  reasons: string[];
}

export class EnhancedMLClient {
  private isEnabled: boolean = false;
  private serviceUrl: string = "http://localhost:5001";
  private isRequestInFlight: boolean = false;
  private lastEvaluationTime: number = 0;
  private lastResult: EnhancedPredictionResult = {
    isAvailable: false,
    scoreAdjustment: 0,
    reasons: [],
  };

  constructor(enabled: boolean = false, serviceUrl?: string) {
    this.isEnabled = enabled;
    if (serviceUrl) {
      this.serviceUrl = serviceUrl;
    }
  }

  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  public getIsEnabled(): boolean {
    return this.isEnabled;
  }

  public setServiceUrl(url: string): void {
    this.serviceUrl = url;
  }

  /**
   * Evaluates a small cropped base64 eye/face thumbnail every 2 seconds.
   * Completely asynchronous and non-blocking: never halts requestAnimationFrame.
   */
  public async evaluateCrop(
    cropBase64: string,
    nowTimestamp: number,
    predictType: "eye" | "emotion" = "eye"
  ): Promise<EnhancedPredictionResult> {
    if (!this.isEnabled) {
      return { isAvailable: false, scoreAdjustment: 0, reasons: [] };
    }

    // Rate-limit to once every 2.0 seconds
    if (nowTimestamp - this.lastEvaluationTime < 2.0 || this.isRequestInFlight) {
      return this.lastResult;
    }

    this.isRequestInFlight = true;
    this.lastEvaluationTime = nowTimestamp;

    try {
      const response = await fetch("/api/enhanced/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          predictType,
          image: cropBase64,
          serviceUrl: this.serviceUrl,
        }),
      });

      if (!response.ok) {
        this.lastResult = { isAvailable: false, scoreAdjustment: 0, reasons: [] };
        return this.lastResult;
      }

      const resJson = await response.json();
      if (!resJson.available || !resJson.data) {
        this.lastResult = { isAvailable: false, scoreAdjustment: 0, reasons: [] };
        return this.lastResult;
      }

      let scoreAdjustment = 0;
      const reasons: string[] = [];

      if (predictType === "eye") {
        const closedProb = Number(resJson.data.closed_probability ?? 0);
        const openProb = Number(resJson.data.open_probability ?? 1);

        // Merge as a WEAK signal (max 8 points out of 100)
        if (closedProb >= 0.85) {
          scoreAdjustment = Math.min(Math.round(closedProb * 8), 8);
          reasons.push("secondary CNN closure confirmation");
        }

        this.lastResult = {
          closedProbability: closedProb,
          openProbability: openProb,
          isAvailable: true,
          scoreAdjustment,
          reasons,
        };
      } else {
        // Emotion evaluation
        const dominant = String(resJson.data.dominant_emotion ?? "neutral");
        if (dominant === "sad" || dominant === "fear") {
          scoreAdjustment = 4;
          reasons.push(`secondary expression cue: ${dominant}`);
        }

        this.lastResult = {
          dominantEmotion: dominant,
          isAvailable: true,
          scoreAdjustment,
          reasons,
        };
      }

      return this.lastResult;
    } catch {
      // Graceful fallback without interrupting detection loop
      this.lastResult = { isAvailable: false, scoreAdjustment: 0, reasons: [] };
      return this.lastResult;
    } finally {
      this.isRequestInFlight = false;
    }
  }

  public getLastResult(): EnhancedPredictionResult {
    return this.lastResult;
  }
}

/**
 * Merges weak secondary signal into primary on-device fatigue assessment.
 * Maximum score adjustment is bounded to 8 points.
 */
export function mergeEnhancedSignal(
  assessment: FatigueAssessment,
  enhanced: EnhancedPredictionResult
): FatigueAssessment {
  if (!enhanced.isAvailable || enhanced.scoreAdjustment <= 0) {
    return assessment;
  }

  const mergedScore = Math.min(100, assessment.score + enhanced.scoreAdjustment);
  const mergedReasons = [
    ...assessment.reasons,
    ...enhanced.reasons.filter((r) => !assessment.reasons.includes(r)),
  ];

  return {
    ...assessment,
    score: mergedScore,
    reasons: mergedReasons,
  };
}
