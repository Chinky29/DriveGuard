import { DriverStateSnapshot } from "@/lib/types";

export interface TelemetryCardProps {
  readonly snapshot?: DriverStateSnapshot | null;
}

/**
 * TODO: TelemetryCard Component
 *
 * Renders real-time driver telemetry (EAR, PERCLOS, Head Pose Yaw/Pitch, FPS).
 * Telemetry bindings to be completed in subsequent phases.
 */
export function TelemetryCard({ snapshot }: TelemetryCardProps) {
  if (!snapshot) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-500">
        Telemetry inactive
      </div>
    );
  }

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-300">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <span>TELEMETRY</span>
        <span>{snapshot.fps.toFixed(1)} FPS</span>
      </div>
    </div>
  );
}
