/**
 * TODO: CameraFeed Component
 *
 * Manages webcam video element, stream acquisition, and frame rendering.
 * Implementation to be completed in subsequent phases.
 */

export interface CameraFeedProps {
  readonly onFrame?: (video: HTMLVideoElement) => void;
  readonly isRunning?: boolean;
}

export function CameraFeed({ onFrame: _onFrame, isRunning: _isRunning = false }: CameraFeedProps) {
  return (
    <div className="relative w-full aspect-video bg-slate-950 rounded-2xl overflow-hidden border border-slate-800">
      {/* Video feed element will be wired in Phase 1 */}
    </div>
  );
}
