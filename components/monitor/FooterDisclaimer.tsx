"use client";

import React from "react";
import { ShieldAlert } from "lucide-react";

export function FooterDisclaimer() {
  return (
    <footer
      className="w-full border-t border-[#262936] bg-[#0c0d14] py-4 px-6 text-center text-xs text-slate-500"
      role="contentinfo"
    >
      <div className="max-w-3xl mx-auto flex items-center justify-center gap-2">
        <ShieldAlert className="w-4 h-4 text-slate-400 shrink-0" />
        <p className="leading-relaxed">
          <strong className="text-slate-400">Advisory Notice:</strong> DriveGuard is an advisory monitoring prototype and not a certified medical or automotive safety device. Never drive while impaired or excessively fatigued. Pull over in a safe location if you feel tired.
        </p>
      </div>
    </footer>
  );
}
