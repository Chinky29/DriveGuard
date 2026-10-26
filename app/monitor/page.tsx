import React from "react";
import { CameraView } from "@/components/monitor/CameraView";
import Link from "next/link";

export const metadata = {
  title: "DriveGuard | Landmark Monitor (Phase 1)",
  description: "Phase 1 video capture and facial landmark detection test page.",
};

export default function MonitorPage() {
  return (
    <main className="min-h-screen bg-[#07090f] text-slate-100 p-6 flex flex-col items-center">
      <div className="w-full max-w-4xl space-y-6">
        {/* Navigation & Header */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#323232] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#00FF7F]" />
              <h1 className="text-xl font-bold tracking-tight text-white font-mono">
                DriveGuard / Monitor
              </h1>
              <span className="text-[10px] font-mono uppercase bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-slate-700">
                Phase 1 Test
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Webcam capture and MediaPipe FaceLandmarker evaluation. No fatigue scoring active.
            </p>
          </div>

          <Link
            href="/"
            className="text-xs font-mono text-slate-400 hover:text-emerald-400 transition"
          >
            ← Back to Home
          </Link>
        </header>

        {/* Camera Viewport & Debug Overlay */}
        <section className="flex flex-col items-center">
          <CameraView initialDebugOverlay={true} />
        </section>

        {/* Phase 1 Constraints Note */}
        <footer className="bg-[#161616] border border-[#323232] rounded-xl p-4 text-xs font-mono text-slate-400 space-y-1">
          <p className="text-slate-200 font-semibold">Phase 1 Guarantees:</p>
          <ul className="list-disc list-inside space-y-0.5 text-slate-400">
            <li>Local WebAssembly GPU/CPU pipeline without server uploads (Rule 3).</li>
            <li>Mirrored user video preview with 468+ facial landmark overlay.</li>
            <li>Throttled detection loop (15–20 FPS) with automatic background tab pause.</li>
          </ul>
        </footer>
      </div>
    </main>
  );
}
