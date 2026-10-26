"use client";

import React, { useMemo } from "react";
import { FatigueLevel } from "@/lib/detection/fatigue";
import { ShieldCheck, AlertCircle, AlertTriangle, AlertOctagon } from "lucide-react";

export interface ScoreGaugeProps {
  readonly score: number; // 0 to 100
  readonly level: FatigueLevel;
  readonly isFaceReliable: boolean;
  readonly size?: number;
}

const LEVEL_THEMES: Record<
  FatigueLevel,
  {
    stroke: string;
    text: string;
    bgGlow: string;
    badgeBg: string;
    badgeBorder: string;
    badgeText: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  Normal: {
    stroke: "#2ECC71",
    text: "text-emerald-400",
    bgGlow: "rgba(46, 204, 113, 0.15)",
    badgeBg: "bg-emerald-950/40",
    badgeBorder: "border-emerald-600/40",
    badgeText: "text-emerald-300",
    label: "Attentive",
    icon: ShieldCheck,
  },
  Notice: {
    stroke: "#F1C40F",
    text: "text-amber-400",
    bgGlow: "rgba(241, 196, 15, 0.15)",
    badgeBg: "bg-amber-950/40",
    badgeBorder: "border-amber-600/40",
    badgeText: "text-amber-300",
    label: "Advisory Notice",
    icon: AlertCircle,
  },
  Warning: {
    stroke: "#E67E22",
    text: "text-orange-400",
    bgGlow: "rgba(230, 126, 34, 0.2)",
    badgeBg: "bg-orange-950/50",
    badgeBorder: "border-orange-600/50",
    badgeText: "text-orange-300",
    label: "Elevated Alert",
    icon: AlertTriangle,
  },
  Critical: {
    stroke: "#E74C3C",
    text: "text-red-500",
    bgGlow: "rgba(231, 76, 60, 0.25)",
    badgeBg: "bg-red-950/60",
    badgeBorder: "border-red-600/60",
    badgeText: "text-red-300",
    label: "Critical Alert",
    icon: AlertOctagon,
  },
};

export function ScoreGauge({
  score,
  level,
  isFaceReliable,
  size = 200,
}: ScoreGaugeProps) {
  const theme = LEVEL_THEMES[isFaceReliable ? level : "Normal"];
  const Icon = theme.icon;

  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Clamped progress ratio 0.0 to 1.0
  const progressRatio = isFaceReliable ? Math.max(0, Math.min(100, score)) / 100 : 0;
  const strokeDashoffset = useMemo(() => {
    return circumference - progressRatio * circumference;
  }, [circumference, progressRatio]);

  return (
    <div
      className="flex flex-col items-center justify-center relative p-4 select-none"
      style={{ width: size, height: size }}
      role="region"
      aria-label={`Driver Alertness Score: ${isFaceReliable ? score : "Unavailable"}`}
    >
      <svg
        className="w-full h-full -rotate-90 transform motion-reduce:transition-none"
        viewBox={`0 0 ${size} ${size}`}
      >
        {/* Background track circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className="stroke-[#222533] dark:stroke-[#20222e] light:stroke-slate-200"
          strokeWidth={strokeWidth}
          fill="transparent"
        />

        {/* Animated colored score ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={isFaceReliable ? theme.stroke : "#64748b"}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
          className="transition-[stroke-dashoffset,stroke] duration-500 ease-out motion-reduce:transition-none"
          style={{
            filter: isFaceReliable
              ? `drop-shadow(0 0 8px ${theme.stroke})`
              : "none",
          }}
        />
      </svg>

      {/* Center Readout */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
        {isFaceReliable ? (
          <>
            <span
              className={`text-4xl sm:text-5xl font-extrabold tracking-tight font-mono ${theme.text}`}
            >
              {score}
            </span>
            <span className="text-[11px] font-medium text-slate-400 dark:text-slate-400 light:text-slate-600 uppercase tracking-widest mt-0.5">
              Fatigue Score
            </span>
            <div
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 mt-2 rounded-full border text-[11px] font-semibold ${theme.badgeBg} ${theme.badgeBorder} ${theme.badgeText}`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{theme.label}</span>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center p-2">
            <span className="text-2xl font-bold text-slate-500 font-mono">--</span>
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-1 text-center">
              Tracking Paused
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
