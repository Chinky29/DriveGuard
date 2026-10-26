"use client";

import React from "react";
import {
  Play,
  Pause,
  Square,
  Sliders,
  Sun,
  Moon,
  Volume2,
  VolumeX,
  Bug,
  Activity,
} from "lucide-react";

export interface SessionControlsProps {
  readonly elapsedSeconds: number;
  readonly isPaused: boolean;
  readonly isFaceReliable: boolean;
  readonly lightStatus: "optimal" | "low";
  readonly isAudioUnlocked: boolean;
  readonly isDebugVisible: boolean;
  readonly isDarkTheme: boolean;
  readonly onTogglePause: () => void;
  readonly onEndSession: () => void;
  readonly onOpenCalibration: () => void;
  readonly onUnlockAudio: () => void;
  readonly onToggleDebug: () => void;
  readonly onToggleTheme: () => void;
}

export function formatSessionDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  const pad = (n: number) => n.toString().padStart(2, "0");
  if (h > 0) {
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  }
  return `${pad(m)}:${pad(s)}`;
}

export function SessionControls({
  elapsedSeconds,
  isPaused,
  isFaceReliable,
  lightStatus,
  isAudioUnlocked,
  isDebugVisible,
  isDarkTheme,
  onTogglePause,
  onEndSession,
  onOpenCalibration,
  onUnlockAudio,
  onToggleDebug,
  onToggleTheme,
}: SessionControlsProps) {
  return (
    <div className="w-full bg-[#14161f] border border-[#262936] rounded-xl p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3 shadow-sm">
      {/* Left: Session Timer & Status Badges */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Session Timer */}
        <div className="flex items-center gap-2 bg-[#0b0c12] px-3 py-1.5 rounded-lg border border-[#222634]">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-slate-400 uppercase font-semibold">Session:</span>
          <span className="font-mono text-sm font-bold text-white tracking-wider">
            {formatSessionDuration(elapsedSeconds)}
          </span>
        </div>

        {/* Face Status Pill */}
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${
            isFaceReliable
              ? "bg-emerald-950/40 border-emerald-800/60 text-emerald-300"
              : "bg-red-950/40 border-red-800/60 text-red-300"
          }`}
          role="status"
          aria-live="polite"
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isFaceReliable ? "bg-emerald-400" : "bg-red-400"
            }`}
          />
          <span>{isFaceReliable ? "Face Aligned" : "Face Lost"}</span>
        </div>

        {/* Ambient Light Status */}
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${
            lightStatus === "optimal"
              ? "bg-slate-900 border-slate-700 text-slate-300"
              : "bg-amber-950/40 border-amber-800/60 text-amber-300"
          }`}
        >
          <Sun className="w-3.5 h-3.5" />
          <span>{lightStatus === "optimal" ? "Good Light" : "Low Light"}</span>
        </div>
      </div>

      {/* Right: Action Buttons */}
      <div className="flex items-center gap-2">
        {/* Audio Unlock Button */}
        <button
          onClick={onUnlockAudio}
          className={`p-2 rounded-lg border text-xs font-medium transition ${
            isAudioUnlocked
              ? "bg-emerald-950/40 border-emerald-800 text-emerald-300"
              : "bg-amber-950/60 border-amber-800 text-amber-300 hover:bg-amber-900"
          }`}
          title={isAudioUnlocked ? "Audio alerts enabled" : "Click to enable audio alerts"}
          aria-label={isAudioUnlocked ? "Audio alerts enabled" : "Enable audio alerts"}
        >
          {isAudioUnlocked ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>

        {/* Calibration Trigger */}
        <button
          onClick={onOpenCalibration}
          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium transition"
          title="Recalibrate Driver Baseline"
          aria-label="Recalibrate Driver Baseline"
        >
          <Sliders className="w-4 h-4" />
        </button>

        {/* Theme Toggle */}
        <button
          onClick={onToggleTheme}
          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium transition"
          title={isDarkTheme ? "Switch to Light Theme" : "Switch to Dark Theme"}
          aria-label="Toggle theme"
        >
          {isDarkTheme ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Debug Toggle */}
        <button
          onClick={onToggleDebug}
          className={`p-2 rounded-lg border text-xs font-medium transition ${
            isDebugVisible
              ? "bg-emerald-950/50 border-emerald-700 text-emerald-300"
              : "bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-400"
          }`}
          title="Toggle Raw Telemetry Debug Panel"
          aria-label="Toggle raw telemetry debug"
        >
          <Bug className="w-4 h-4" />
        </button>

        {/* Pause / Resume Button */}
        <button
          onClick={onTogglePause}
          className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition ${
            isPaused
              ? "bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500"
              : "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
          }`}
          aria-label={isPaused ? "Resume Session" : "Pause Session"}
        >
          {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
          <span>{isPaused ? "Resume" : "Pause"}</span>
        </button>

        {/* End Session Button */}
        <button
          onClick={onEndSession}
          className="px-3 py-1.5 rounded-lg bg-red-600/90 hover:bg-red-500 text-white border border-red-500 text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
          aria-label="End Session & View Summary"
        >
          <Square className="w-3.5 h-3.5" />
          <span>End Session</span>
        </button>
      </div>
    </div>
  );
}
