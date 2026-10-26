/**
 * DriveGuard Multi-Level Alert & Notification Manager
 *
 * Implements:
 * - Three active alarm levels: Notice, Warning, Critical
 * - Web Audio API synthesizer with user-gesture audio context unlock
 * - Haptic vibration feedback (navigator.vibrate) where supported
 * - Anti-spam cooldown timers per alert level with higher-severity bypass
 * - "Face Not Visible" non-alarm informational state that escalates only after a timeout
 *
 * Compliant with Rule 1 (Neutral Advisory) and Rule 2 (Reliability Guard).
 */

import { DEFAULT_CONFIG, DriveGuardConfig } from "./config";
import { FatigueLevel } from "./fatigue";

export type AlertLevel = "Notice" | "Warning" | "Critical";

export interface AlertDispatchResult {
  readonly level: AlertLevel | "Normal" | "FaceNotVisible";
  readonly triggered: boolean;
  readonly suppressedByCooldown: boolean;
  readonly audioPlayed: boolean;
  readonly vibrationTriggered: boolean;
  readonly message: string;
  readonly timestamp: number;
}

export class AlertManager {
  private config: DriveGuardConfig;
  private audioCtx: AudioContext | null = null;
  private isAudioUnlocked: boolean = false;

  // Cooldown tracking per alert level
  private lastAlertTime: Record<AlertLevel, number> = {
    Notice: -Infinity,
    Warning: -Infinity,
    Critical: -Infinity,
  };

  // Face lost timeout tracking
  private faceLostStartTime: number | null = null;
  private hasEscalatedFaceLost: boolean = false;

  constructor(config: DriveGuardConfig = DEFAULT_CONFIG) {
    this.config = config;
    this.initAudioContext();
  }

  /**
   * Initializes Web Audio Context if running in browser.
   */
  private initAudioContext(): void {
    if (typeof window === "undefined") return;

    try {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    } catch {
      // AudioContext unavailable or restricted
    }
  }

  /**
   * Unlocks the Web Audio context on a user gesture (pointerdown, click, keydown).
   */
  public unlockAudio(): boolean {
    if (!this.audioCtx) {
      this.initAudioContext();
    }

    if (this.audioCtx) {
      if (this.audioCtx.state === "suspended") {
        this.audioCtx
          .resume()
          .then(() => {
            this.isAudioUnlocked = true;
          })
          .catch(() => {
            this.isAudioUnlocked = false;
          });
      } else if (this.audioCtx.state === "running") {
        this.isAudioUnlocked = true;
      }
    }

    return this.isAudioUnlocked;
  }

  /**
   * Checks if audio context is currently unlocked.
   */
  public getAudioUnlocked(): boolean {
    return this.isAudioUnlocked || (this.audioCtx !== null && this.audioCtx.state === "running");
  }

  /**
   * Dispatches audio tone for an alert level.
   */
  public playAlertSound(level: AlertLevel): boolean {
    if (!this.audioCtx) {
      this.initAudioContext();
    }
    if (!this.audioCtx || this.audioCtx.state === "suspended") {
      return false;
    }

    try {
      const ctx = this.audioCtx;
      const freq = this.config.alerts.toneFrequencies[
        level.toLowerCase() as keyof typeof this.config.alerts.toneFrequencies
      ];

      if (level === "Notice") {
        // Single gentle advisory tone
        this.synthesizeTone(ctx, freq, 0.15, 0.2, "sine");
      } else if (level === "Warning") {
        // Dual stepped tone
        this.synthesizeTone(ctx, freq, 0.15, 0.3, "triangle");
        setTimeout(() => {
          if (ctx.state === "running") {
            this.synthesizeTone(ctx, freq * 0.85, 0.18, 0.3, "triangle");
          }
        }, 120);
      } else if (level === "Critical") {
        // Triple urgent pulses
        for (let i = 0; i < 3; i++) {
          setTimeout(() => {
            if (ctx.state === "running") {
              this.synthesizeTone(ctx, freq, 0.10, 0.45, "square");
            }
          }, i * 140);
        }
      }
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Synthesizes a tone with gain envelope.
   */
  private synthesizeTone(
    ctx: AudioContext,
    frequency: number,
    duration: number,
    maxGain: number,
    type: OscillatorType
  ): void {
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(frequency, ctx.currentTime);

      gain.gain.setValueAtTime(maxGain, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {
      // Audio synthesis fallback
    }
  }

  /**
   * Triggers haptic vibration if supported on the device.
   */
  public triggerVibration(level: AlertLevel): boolean {
    if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") {
      return false;
    }

    try {
      const pattern = this.config.alerts.vibratePatterns[
        level.toLowerCase() as keyof typeof this.config.alerts.vibratePatterns
      ];
      return navigator.vibrate(pattern as number[]);
    } catch {
      return false;
    }
  }

  /**
   * Processes a fatigue evaluation or tracking state and executes alerts.
   */
  public evaluate(
    currentFatigueLevel: FatigueLevel,
    isFaceReliable: boolean,
    nowSeconds: number,
    reasons: readonly string[] = []
  ): AlertDispatchResult {
    // 1. Face Not Visible State Handling (Rule 2)
    if (!isFaceReliable) {
      if (this.faceLostStartTime === null) {
        this.faceLostStartTime = nowSeconds;
        this.hasEscalatedFaceLost = false;
      }

      const lostDuration = nowSeconds - this.faceLostStartTime;
      const timeout = this.config.alerts.faceLostTimeoutSeconds;

      // Has not reached timeout: Non-alarm informational state
      if (lostDuration < timeout) {
        return {
          level: "FaceNotVisible",
          triggered: false,
          suppressedByCooldown: false,
          audioPlayed: false,
          vibrationTriggered: false,
          message: `${this.config.reliability.unreliableReason} (${lostDuration.toFixed(1)}s)`,
          timestamp: nowSeconds,
        };
      }

      // Reached timeout: Escalate to Warning level alert
      const warningCooldown = this.config.alerts.cooldownSeconds.warning;
      const canEscalate =
        nowSeconds - this.lastAlertTime.Warning >= warningCooldown || !this.hasEscalatedFaceLost;

      if (canEscalate) {
        const audioPlayed = this.playAlertSound("Warning");
        const vibrationTriggered = this.triggerVibration("Warning");
        this.lastAlertTime.Warning = nowSeconds;
        this.hasEscalatedFaceLost = true;

        return {
          level: "Warning",
          triggered: true,
          suppressedByCooldown: false,
          audioPlayed,
          vibrationTriggered,
          message: `Face tracking lost for extended duration (>${timeout.toFixed(0)}s)`,
          timestamp: nowSeconds,
        };
      }

      return {
        level: "FaceNotVisible",
        triggered: false,
        suppressedByCooldown: true,
        audioPlayed: false,
        vibrationTriggered: false,
        message: `Face tracking lost for extended duration (cooldown active)`,
        timestamp: nowSeconds,
      };
    }

    // Face is reliable: Reset face lost timer
    this.faceLostStartTime = null;
    this.hasEscalatedFaceLost = false;

    // Normal level: silent, nominal
    if (currentFatigueLevel === "Normal") {
      return {
        level: "Normal",
        triggered: false,
        suppressedByCooldown: false,
        audioPlayed: false,
        vibrationTriggered: false,
        message: "Attentive - Nominal",
        timestamp: nowSeconds,
      };
    }

    // Notice, Warning, Critical alerts: check cooldown
    const level = currentFatigueLevel as AlertLevel;
    const cooldown = this.config.alerts.cooldownSeconds[
      level.toLowerCase() as keyof typeof this.config.alerts.cooldownSeconds
    ];
    const timeSinceLast = nowSeconds - this.lastAlertTime[level];

    // Anti-spam cooldown check
    if (timeSinceLast < cooldown) {
      return {
        level,
        triggered: false,
        suppressedByCooldown: true,
        audioPlayed: false,
        vibrationTriggered: false,
        message: `${reasons.join(", ")} (cooldown active: ${(cooldown - timeSinceLast).toFixed(1)}s)`,
        timestamp: nowSeconds,
      };
    }

    // Fire alert
    const audioPlayed = this.playAlertSound(level);
    const vibrationTriggered = this.triggerVibration(level);
    this.lastAlertTime[level] = nowSeconds;

    return {
      level,
      triggered: true,
      suppressedByCooldown: false,
      audioPlayed,
      vibrationTriggered,
      message: reasons.join(", ") || level,
      timestamp: nowSeconds,
    };
  }

  /**
   * Resets all cooldowns and face lost timers.
   */
  public reset(): void {
    this.lastAlertTime = {
      Notice: -Infinity,
      Warning: -Infinity,
      Critical: -Infinity,
    };
    this.faceLostStartTime = null;
    this.hasEscalatedFaceLost = false;
  }
}
