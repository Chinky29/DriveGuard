"use client";

import React, { useState, useEffect } from "react";
import { ShieldCheck, VideoOff, Database, CheckCircle2, Lock } from "lucide-react";

interface ConsentModalProps {
  isOpen?: boolean;
  onConsentGiven?: () => void;
  forceShow?: boolean;
}

export const CONSENT_STORAGE_KEY = "driveguard_telemetry_consent";

export function ConsentModal({
  isOpen: controlledIsOpen,
  onConsentGiven,
  forceShow = false,
}: ConsentModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);

  useEffect(() => {
    if (forceShow) {
      setInternalOpen(true);
      return;
    }
    const hasConsented = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!hasConsented) {
      setInternalOpen(true);
    }
  }, [forceShow]);

  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalOpen;

  const handleAccept = () => {
    localStorage.setItem(CONSENT_STORAGE_KEY, "true");
    setInternalOpen(false);
    if (onConsentGiven) {
      onConsentGiven();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="consent-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
    >
      <div className="w-full max-w-lg bg-[#141620] border border-[#2a2d3d] rounded-2xl p-6 text-slate-100 shadow-2xl flex flex-col gap-5">
        {/* Header Icon & Title */}
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div>
            <h2 id="consent-title" className="text-lg font-bold text-white tracking-tight">
              Privacy & Telemetry Consent
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Strict Rule 3 Compliance: Local Edge Processing Only
            </p>
          </div>
        </div>

        {/* Core Guarantees Cards */}
        <div className="space-y-3 text-xs leading-relaxed">
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-[#0e1017] border border-[#1e212f]">
            <VideoOff className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-200">Zero Video Storage Guarantee</p>
              <p className="text-slate-400 mt-0.5">
                Camera frames are analyzed strictly inside your browser’s temporary GPU memory.
                <strong className="text-emerald-300 font-medium"> Raw camera frames are NEVER recorded, stored on disk, or uploaded to any server.</strong>
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-[#0e1017] border border-[#1e212f]">
            <Database className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-200">Numerical Telemetry Only</p>
              <p className="text-slate-400 mt-0.5">
                Only calculated physiological metrics (Eye Aspect Ratio, PERCLOS percentage, head pose angles, and timestamps) are synced to your private history to track alertness trends over time.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-[#0e1017] border border-[#1e212f]">
            <Lock className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-200">User Data Ownership</p>
              <p className="text-slate-400 mt-0.5">
                Data is locked to your Clerk user account via PostgreSQL Row Level Security. You can export everything to CSV/JSON or permanently purge all history from the Settings page.
              </p>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[#222533]">
          <span className="text-[11px] text-slate-500 font-mono">
            DriveGuard Engineering Rule 3
          </span>
          <button
            onClick={handleAccept}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs tracking-wide transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>I Understand & Agree</span>
          </button>
        </div>
      </div>
    </div>
  );
}
