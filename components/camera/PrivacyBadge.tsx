/**
 * TODO: PrivacyBadge Component
 *
 * Implements Rule 3 (Privacy by Design): Displays persistent visual badge
 * certifying that video frames are processed strictly in local browser memory.
 * UI to be wired when camera stream is active in subsequent phases.
 */

export interface PrivacyBadgeProps {
  readonly isActive?: boolean;
}

export function PrivacyBadge({ isActive = false }: PrivacyBadgeProps) {
  if (!isActive) return null;

  return (
    <div
      aria-label="Camera active in local memory only"
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-700/60 text-xs font-mono text-emerald-400"
    >
      <span className="w-2 h-2 rounded-full bg-emerald-500" />
      <span>Camera Active [Local Processing Only]</span>
    </div>
  );
}
