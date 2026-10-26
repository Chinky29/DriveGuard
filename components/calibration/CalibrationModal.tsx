"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  DriverCalibrationSession,
  CalibratedThresholds,
  CalibrationProgress,
} from "@/lib/detection/calibration";
import { DEFAULT_CONFIG } from "@/lib/detection/config";

export interface CalibrationModalProps {
  readonly isOpen: boolean;
  readonly currentEAR: number;
  readonly currentMAR: number;
  readonly isFaceReliable: boolean;
  readonly onComplete: (thresholds: CalibratedThresholds) => void;
  readonly onSkip: (thresholds: CalibratedThresholds) => void;
  readonly onClose?: () => void;
}

export function CalibrationModal({
  isOpen,
  currentEAR,
  currentMAR,
  isFaceReliable,
  onComplete,
  onSkip,
  onClose,
}: CalibrationModalProps) {
  const [phase, setPhase] = useState<"calibrating" | "results" | "skipped">("calibrating");
  const [progress, setProgress] = useState<CalibrationProgress>({
    elapsedSeconds: 0,
    remainingSeconds: 20,
    progressRatio: 0,
    sampleCount: 0,
    isComplete: false,
    isFaceReliable: false,
  });
  const [calibratedResult, setCalibratedResult] = useState<CalibratedThresholds | null>(null);

  const sessionRef = useRef<DriverCalibrationSession>(
    new DriverCalibrationSession(DEFAULT_CONFIG)
  );

  // Reset calibration session when modal opens
  useEffect(() => {
    if (isOpen) {
      sessionRef.current.reset();
      setPhase("calibrating");
      setCalibratedResult(null);
      setProgress({
        elapsedSeconds: 0,
        remainingSeconds: 20,
        progressRatio: 0,
        sampleCount: 0,
        isComplete: false,
        isFaceReliable: false,
      });
    }
  }, [isOpen]);

  // Feed live incoming frames into calibration session
  useEffect(() => {
    if (!isOpen || phase !== "calibrating") return;

    const now = performance.now() / 1000;
    sessionRef.current.addSample(now, currentEAR, currentMAR, isFaceReliable);

    const prog = sessionRef.current.getProgress(now);
    setProgress(prog);

    if (prog.isComplete) {
      const result = sessionRef.current.finish();
      setCalibratedResult(result);
      setPhase("results");
    }
  }, [isOpen, phase, currentEAR, currentMAR, isFaceReliable]);

  const handleRetry = () => {
    sessionRef.current.reset();
    setCalibratedResult(null);
    setPhase("calibrating");
  };

  const handleAccept = () => {
    if (calibratedResult) {
      onComplete(calibratedResult);
    }
    if (onClose) onClose();
  };

  const handleSkip = () => {
    const defaultThresholds = sessionRef.current.skip("Calibration skipped by user");
    setCalibratedResult(defaultThresholds);
    setPhase("skipped");
    onSkip(defaultThresholds);
  };

  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = useMemo(() => {
    return circumference - progress.progressRatio * circumference;
  }, [progress.progressRatio, circumference]);

  if (!isOpen) return null;

  return (
    <div
      id="calibration-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200"
    >
      <div
        id="calibration-modal-container"
        className="w-full max-w-lg bg-[#14161f] border border-[#262936] rounded-2xl shadow-2xl overflow-hidden p-6 text-slate-100 font-sans"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#262936]">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <h2 className="text-base font-bold tracking-wide uppercase text-white">
              Driver Baseline Calibration
            </h2>
          </div>
          {phase === "calibrating" && (
            <button
              onClick={handleSkip}
              className="text-xs text-slate-400 hover:text-slate-200 underline transition"
            >
              Skip
            </button>
          )}
        </div>

        {/* Phase 1: Calibrating (20-second circular progress ring) */}
        {phase === "calibrating" && (
          <div className="flex flex-col items-center py-6 text-center space-y-4">
            <div className="relative w-36 h-36 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 128 128">
                {/* Background Ring */}
                <circle
                  cx="64"
                  cy="64"
                  r={radius}
                  className="stroke-[#222634]"
                  strokeWidth="8"
                  fill="transparent"
                />
                {/* Animated Progress Ring */}
                <circle
                  cx="64"
                  cy="64"
                  r={radius}
                  className="stroke-emerald-400 transition-all duration-150 ease-linear"
                  strokeWidth="8"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-extrabold text-white font-mono">
                  {Math.ceil(progress.remainingSeconds)}s
                </span>
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Remaining</span>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-100">
                Look straight ahead with a relaxed, normal expression.
              </p>
              <p className="text-xs text-slate-400 max-w-sm">
                Blink naturally. We are measuring your unique eye and mouth geometry to eliminate false alarms.
              </p>
            </div>

            {/* Live Facial Tracking Status */}
            <div className="w-full max-w-xs bg-[#0b0c12] border border-[#222634] rounded-lg p-2.5 flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400">Tracking:</span>
              <span
                className={`font-semibold ${
                  isFaceReliable ? "text-emerald-400" : "text-amber-400"
                }`}
              >
                {isFaceReliable ? "Face Aligned" : "Adjust Face Position"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 w-full max-w-xs font-mono text-xs">
              <div className="bg-[#0b0c12] p-2 rounded border border-[#222634]">
                <span className="text-slate-500 block text-[10px]">Current EAR</span>
                <span className="text-emerald-400 font-bold">{currentEAR.toFixed(3)}</span>
              </div>
              <div className="bg-[#0b0c12] p-2 rounded border border-[#222634]">
                <span className="text-slate-500 block text-[10px]">Current MAR</span>
                <span className="text-emerald-400 font-bold">{currentMAR.toFixed(3)}</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={handleSkip}
                className="px-4 py-2 text-xs text-slate-400 hover:text-slate-200 border border-slate-700/60 rounded-lg hover:border-slate-600 transition"
              >
                Use System Defaults (Skip)
              </button>
            </div>
          </div>
        )}

        {/* Phase 2: Calibration Results Screen */}
        {phase === "results" && calibratedResult && (
          <div className="py-6 space-y-5">
            <div className="text-center space-y-1">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center mb-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-white">Calibration Complete</h3>
              <p className="text-xs text-slate-400">
                Outliers filtered using median absolute deviation. Personalized thresholds active.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 font-mono text-xs">
              <div className="bg-[#0b0c12] p-3 rounded-lg border border-[#222634]">
                <span className="text-slate-500 block text-[10px] uppercase">Baseline EAR (Open)</span>
                <span className="text-lg font-bold text-white">{calibratedResult.baselineEAR.toFixed(3)}</span>
                <span className="text-[10px] text-slate-400 block mt-1">
                  Threshold: {calibratedResult.earLowThreshold.toFixed(3)}
                </span>
              </div>
              <div className="bg-[#0b0c12] p-3 rounded-lg border border-[#222634]">
                <span className="text-slate-500 block text-[10px] uppercase">Baseline MAR (Closed)</span>
                <span className="text-lg font-bold text-white">{calibratedResult.baselineMAR.toFixed(3)}</span>
                <span className="text-[10px] text-slate-400 block mt-1">
                  Threshold: {calibratedResult.marOpenThreshold.toFixed(3)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleRetry}
                className="flex-1 py-2.5 rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition"
              >
                Recalibrate (Retry)
              </button>
              <button
                onClick={handleAccept}
                className="flex-1 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white transition shadow-lg shadow-emerald-950"
              >
                Accept & Start Monitoring
              </button>
            </div>
          </div>
        )}

        {/* Phase 3: Calibration Skipped Notice Screen */}
        {phase === "skipped" && (
          <div className="py-6 space-y-5 text-center">
            <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-400 mx-auto flex items-center justify-center mb-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-amber-400">Calibration Skipped</h3>
              <p className="text-xs text-slate-300 max-w-sm mx-auto">
                DriveGuard will use factory default thresholds (EAR 0.21, MAR 0.55). You can recalibrate at any time from the cockpit settings.
              </p>
            </div>

            <div className="p-3 bg-amber-950/30 border border-amber-800/50 rounded-lg text-xs font-mono text-amber-300">
              Notice: Standard population averages in effect.
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleRetry}
                className="flex-1 py-2.5 rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition"
              >
                Calibrate Now
              </button>
              <button
                onClick={handleAccept}
                className="flex-1 py-2.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-xs font-semibold text-white transition"
              >
                Continue With Defaults
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
