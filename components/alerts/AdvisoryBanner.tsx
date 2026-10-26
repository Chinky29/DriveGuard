import { AdvisoryLevel } from "@/lib/types";

export interface AdvisoryBannerProps {
  readonly level?: AdvisoryLevel;
  readonly reason?: string;
  readonly durationSeconds?: number;
}

/**
 * TODO: AdvisoryBanner Component
 *
 * Implements Rule 1 (Neutral Advisory Phrasing): Renders non-judgmental status
 * pills with strictly observable physiological reasons.
 * State bindings to be completed in subsequent phases.
 */
export function AdvisoryBanner({
  level,
  reason,
  durationSeconds = 0,
}: AdvisoryBannerProps) {
  if (!level || !reason) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="px-4 py-2 rounded-full border text-sm font-medium tracking-wide flex items-center gap-2"
    >
      <span className="font-semibold uppercase tracking-wider">{level}:</span>
      <span>{reason}</span>
      {durationSeconds > 0 && (
        <span className="text-xs opacity-75 font-mono">({durationSeconds.toFixed(1)}s)</span>
      )}
    </div>
  );
}
