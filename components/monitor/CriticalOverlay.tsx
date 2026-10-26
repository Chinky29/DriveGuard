"use client";

import React, { useEffect, useRef } from "react";
import { AlertOctagon, HeartHandshake } from "lucide-react";

export interface CriticalOverlayProps {
  readonly isOpen: boolean;
  readonly reasons: readonly string[];
  readonly onAcknowledge: () => void;
}

export function CriticalOverlay({
  isOpen,
  reasons,
  onAcknowledge,
}: CriticalOverlayProps) {
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  // Focus the "I'm awake" button on appearance for immediate keyboard accessibility
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      buttonRef.current.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="critical-alert-title"
      aria-describedby="critical-alert-desc"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-red-950/90 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="w-full max-w-lg bg-[#180808] border-2 border-red-600 rounded-3xl p-6 sm:p-8 text-center text-white shadow-2xl shadow-red-950/80 space-y-6 motion-safe:animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite]">
        <div className="w-16 h-16 rounded-full bg-red-600/30 border-2 border-red-500 mx-auto flex items-center justify-center text-red-400">
          <AlertOctagon className="w-9 h-9 animate-bounce" />
        </div>

        <div className="space-y-2">
          <h2
            id="critical-alert-title"
            className="text-2xl sm:text-3xl font-black uppercase tracking-wide text-red-400"
          >
            Critical Alert
          </h2>
          <p
            id="critical-alert-desc"
            className="text-sm sm:text-base text-red-100/90 font-medium max-w-sm mx-auto"
          >
            Prolonged closure or severe fatigue cues detected. Please verify your attention immediately or pull over safely.
          </p>
        </div>

        {/* Reason Chips */}
        <div className="flex flex-wrap justify-center gap-2">
          {reasons.map((r, i) => (
            <span
              key={i}
              className="text-xs px-3 py-1 rounded-full bg-red-900/60 border border-red-700/80 text-red-200 font-mono"
            >
              {r}
            </span>
          ))}
        </div>

        {/* Primary Action Button: "I'm awake" */}
        <div className="pt-2">
          <button
            ref={buttonRef}
            onClick={onAcknowledge}
            className="w-full py-4 px-6 rounded-2xl bg-red-600 hover:bg-red-500 active:scale-[0.98] text-white text-base sm:text-lg font-extrabold uppercase tracking-wider shadow-lg shadow-red-900 transition-all focus:outline-none focus-visible:ring-4 focus-visible:ring-white flex items-center justify-center gap-2"
            aria-label="I'm awake - Acknowledge alert"
          >
            <HeartHandshake className="w-6 h-6" />
            <span>I&apos;m awake</span>
          </button>
          <span className="block text-[11px] text-red-300/70 mt-2 font-mono">
            Press [Space] or [Enter] to acknowledge
          </span>
        </div>
      </div>
    </div>
  );
}
