/**
 * DriveGuard - Phase 0 Neutral Placeholder
 *
 * UI logic and detection pipeline integration will be implemented in subsequent phases.
 */
export default function Home() {
  return (
    <main className="min-h-screen bg-[#07090f] text-slate-100 flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md p-8 border border-slate-800 rounded-2xl bg-slate-900/40 shadow-xl space-y-3">
        <h1 className="text-xl font-semibold text-white">DriveGuard</h1>
        <p className="text-sm text-slate-400">
          Phase 0 environment initialized. Real-time monitoring and detection pipeline will be wired in subsequent phases.
        </p>
        <div className="pt-2">
          <a
            href="/monitor"
            className="inline-block px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold font-mono transition"
          >
            Launch /monitor (Phase 1 Test) →
          </a>
        </div>
      </div>
    </main>
  );
}
