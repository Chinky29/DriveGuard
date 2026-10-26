"use client";

import React from "react";
import { AlertCircle, AlertTriangle, X } from "lucide-react";
import { FatigueLevel } from "@/lib/detection/fatigue";

export interface AlertBannerProps {
  readonly level: FatigueLevel;
  readonly reasons: readonly string[];
  readonly onDismiss?: () => void;
}

export function AlertBanner({ level, reasons, onDismiss }: AlertBannerProps) {
  if (level !== "Notice" && level !== "Warning") {
    return null;
  }

  const isWarning = level === "Warning";
  const Icon = isWarning ? AlertTriangle : AlertCircle;

  return (
    <div
      role="alert"
      aria-live={isWarning ? "assertive" : "polite"}
      className={`w-full rounded-xl border p-3 sm:p-4 flex items-start justify-between gap-3 shadow-lg transition-all animate-in slide-in-from-top-2 duration-300 ${
        isWarning
          ? "bg-orange-950/80 border-orange-600/80 text-orange-100"
          : "bg-amber-950/80 border-amber-600/80 text-amber-100"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
            isWarning ? "bg-orange-900/80 text-orange-300" : "bg-amber-900/80 text-amber-300"
          }`}
        >
          <Icon className="w-5 h-5" />
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                isWarning
                  ? "bg-orange-900 text-orange-200 border-orange-700"
                  : "bg-amber-900 text-amber-200 border-amber-700"
              }`}
            >
              {isWarning ? "Advisory Alert" : "Advisory Notice"}
            </span>
            <span className="text-xs font-medium text-slate-300">
              {isWarning
                ? "Elevated fatigue cues detected."
                : "Mild fatigue indicators observed."}
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5 pt-1">
            {reasons.map((r, i) => (
              <span
                key={i}
                className="text-[11px] px-2 py-0.5 rounded bg-black/40 border border-white/10 font-mono text-slate-200"
              >
                {r}
              </span>
            ))}
          </div>
        </div>
      </div>

      {onDismiss && (
        <button
          onClick={onDismiss}
          className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition"
          aria-label="Dismiss alert notice"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
