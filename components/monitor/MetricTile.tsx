"use client";

import React from "react";
import { Eye, Smile, Compass, Activity, Percent } from "lucide-react";

export interface MetricTileData {
  readonly id: "eyes" | "yawns" | "head" | "blinks" | "perclos";
  readonly title: string;
  readonly value: string;
  readonly subValue: string;
  readonly status: "nominal" | "notice" | "warning";
  readonly statusLabel: string;
}

export interface MetricTileRowProps {
  readonly ear: number;
  readonly isEyeClosed: boolean;
  readonly isMicrosleep: boolean;
  readonly yawnCount: number;
  readonly isYawning: boolean;
  readonly yawnRate: number;
  readonly pitch: number;
  readonly yaw: number;
  readonly nodCount: number;
  readonly isNodding: boolean;
  readonly blinkRate: number;
  readonly blinkCount: number;
  readonly perclos: number;
  readonly isFaceReliable: boolean;
}

export function MetricTileRow({
  ear,
  isEyeClosed,
  isMicrosleep,
  yawnCount,
  isYawning,
  yawnRate,
  pitch,
  yaw,
  nodCount,
  isNodding,
  blinkRate,
  blinkCount,
  perclos,
  isFaceReliable,
}: MetricTileRowProps) {
  const tiles: Array<{
    id: string;
    title: string;
    value: string;
    sub: string;
    badge: string;
    badgeColor: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    {
      id: "eyes",
      title: "Eye State",
      value: isFaceReliable ? ear.toFixed(3) : "--",
      sub: isFaceReliable
        ? isMicrosleep
          ? "Microsleep (>1.0s)"
          : isEyeClosed
          ? "Eyes Closed"
          : "Eyes Open"
        : "Awaiting face",
      badge: isMicrosleep ? "Critical" : isEyeClosed ? "Closed" : "Nominal",
      badgeColor: isMicrosleep
        ? "bg-red-950/60 text-red-400 border-red-800"
        : isEyeClosed
        ? "bg-amber-950/60 text-amber-400 border-amber-800"
        : "bg-emerald-950/60 text-emerald-400 border-emerald-800",
      icon: Eye,
    },
    {
      id: "yawns",
      title: "Yawn Activity",
      value: isFaceReliable ? `${yawnCount}` : "--",
      sub: isFaceReliable
        ? isYawning
          ? "Active Yawn (MAR > 0.55)"
          : `${yawnRate.toFixed(1)}/min`
        : "Awaiting face",
      badge: isYawning ? "Active" : yawnCount > 0 ? "Observed" : "Nominal",
      badgeColor: isYawning
        ? "bg-amber-950/60 text-amber-400 border-amber-800"
        : "bg-slate-900 text-slate-300 border-slate-700",
      icon: Smile,
    },
    {
      id: "head",
      title: "Head Pose",
      value: isFaceReliable
        ? `${pitch >= 0 ? "+" : ""}${pitch.toFixed(1)}°`
        : "--",
      sub: isFaceReliable
        ? `Yaw: ${yaw.toFixed(1)}° | Nods: ${nodCount}`
        : "Awaiting face",
      badge: isNodding ? "Nodding" : "Aligned",
      badgeColor: isNodding
        ? "bg-amber-950/60 text-amber-400 border-amber-800"
        : "bg-slate-900 text-slate-300 border-slate-700",
      icon: Compass,
    },
    {
      id: "blinks",
      title: "Blink Frequency",
      value: isFaceReliable ? `${blinkRate.toFixed(1)}/m` : "--",
      sub: isFaceReliable ? `${blinkCount} total blinks` : "Awaiting face",
      badge: isFaceReliable
        ? blinkRate < 8
          ? "Low"
          : blinkRate > 30
          ? "Elevated"
          : "Normal"
        : "--",
      badgeColor:
        blinkRate < 8 || blinkRate > 30
          ? "bg-amber-950/60 text-amber-400 border-amber-800"
          : "bg-emerald-950/60 text-emerald-400 border-emerald-800",
      icon: Activity,
    },
    {
      id: "perclos",
      title: "PERCLOS (60s)",
      value: isFaceReliable ? `${(perclos * 100).toFixed(1)}%` : "--",
      sub: isFaceReliable
        ? perclos >= 0.25
          ? "Elevated Closure"
          : "Within Nominal Range"
        : "Awaiting face",
      badge: perclos >= 0.25 ? "Warning" : perclos >= 0.15 ? "Notice" : "Optimal",
      badgeColor:
        perclos >= 0.25
          ? "bg-red-950/60 text-red-400 border-red-800"
          : perclos >= 0.15
          ? "bg-amber-950/60 text-amber-400 border-amber-800"
          : "bg-emerald-950/60 text-emerald-400 border-emerald-800",
      icon: Percent,
    },
  ];

  return (
    <div
      className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 w-full"
      role="region"
      aria-label="Real-time Driver Metrics"
    >
      {tiles.map((t) => {
        const Icon = t.icon;
        return (
          <div
            key={t.id}
            className="bg-[#14161f] dark:bg-[#14161f] light:bg-white border border-[#262936] dark:border-[#262936] light:border-slate-200 rounded-xl p-3 flex flex-col justify-between shadow-sm hover:border-[#383c4e] transition"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Icon className="w-3.5 h-3.5 text-slate-400" />
                {t.title}
              </span>
              <span
                className={`text-[9px] px-1.5 py-0.5 rounded border font-semibold ${t.badgeColor}`}
              >
                {t.badge}
              </span>
            </div>

            <div className="my-1.5">
              <span className="text-xl sm:text-2xl font-bold font-mono text-white dark:text-white light:text-slate-900 tracking-tight">
                {t.value}
              </span>
            </div>

            <span className="text-[11px] text-slate-400 dark:text-slate-400 light:text-slate-500 truncate">
              {t.sub}
            </span>
          </div>
        );
      })}
    </div>
  );
}
