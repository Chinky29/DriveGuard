/**
 * Web Audio API Advisory Tone Synthesizer
 *
 * Implements cross-platform audio notifications for NOTICE and WARNING advisory levels.
 * Replaces legacy Windows-only `winsound.Beep`.
 */

export class AdvisoryChimePlayer {
  private audioCtx: AudioContext | null = null;

  private getAudioContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === "suspended") {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  /**
   * Plays a neutral advisory chime (dual sine wave tone)
   */
  public playNoticeChime(): void {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    this.playTone(ctx, 440, 0.15, "sine");
  }

  /**
   * Plays an elevated advisory chime
   */
  public playWarningChime(): void {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    this.playTone(ctx, 660, 0.25, "triangle");
  }

  private playTone(
    ctx: AudioContext,
    frequency: number,
    duration: number,
    type: OscillatorType
  ): void {
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(frequency, ctx.currentTime);

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {
      // Audio autoplay policy fallback
    }
  }
}

export const chimePlayer = new AdvisoryChimePlayer();
