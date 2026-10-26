"use client";

import React, { useState } from "react";
import {
  Eye,
  Activity,
  Compass,
  Smile,
  ShieldCheck,
  Video,
  Radio,
  Sliders,
  CheckCircle2,
} from "lucide-react";

export function CockpitPreview() {
  const [demoState, setDemoState] = useState<"nominal" | "notice">("nominal");

  const isNominal = demoState === "nominal";
  const score = isNominal ? 14 : 38;
  const statusLabel = isNominal ? "Attentive - Nominal" : "Advisory Notice: High PERCLOS";
  const statusColor = isNominal
    ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/30"
    : "text-amber-400 bg-amber-500/10 border-amber-500/30";
  const ringColor = isNominal ? "#10b981" : "#f59e0b";

  return (
    <div className="w-full max-w-4xl mx-auto rounded-2xl overflow-hidden border border-[#2a2d3e] bg-[#0d0f17] shadow-2xl shadow-emerald-500/5 transition-all">
      {/* Mock Window Titlebar */}
      <div className="bg-[#131622] px-4 py-2.5 border-b border-[#222536] flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
          </div>
          <span className="font-mono text-slate-400 text-[11px] ml-2">
            DriveGuard Cockpit Telemetry • Live Simulation
          </span>
        </div>

        {/* Demo State Switcher */}
        <div className="flex items-center gap-1.5 bg-[#0b0d14] p-1 rounded-lg border border-[#1f2231]">
          <button
            onClick={() => setDemoState("nominal")}
            className={`px-2.5 py-1 rounded text-[10px] font-mono font-medium transition ${
              isNominal
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Nominal (Score 14)
          </button>
          <button
            onClick={() => setDemoState("notice")}
            className={`px-2.5 py-1 rounded text-[10px] font-mono font-medium transition ${
              !isNominal
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Notice (Score 38)
          </button>
        </div>
      </div>

      {/* Cockpit HUD Layout */}
      <div className="p-4 sm:p-6 space-y-4">
        {/* Top Badges */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-[11px]">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>CAMERA ACTIVE [LOCAL PROCESSING ONLY]</span>
          </div>

          <div className="flex items-center gap-3 font-mono text-[11px] text-slate-400">
            <span>FPS: 18.8</span>
            <span>•</span>
            <span>Landmarks: 468 (Verified)</span>
            <span>•</span>
            <span className="text-emerald-400">GPU WebAssembly</span>
          </div>
        </div>

        {/* Center Grid: Score Ring + Video Feed Wireframe */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          {/* Simulated Video & 3D Landmark Grid */}
          <div className="md:col-span-7 h-56 rounded-xl bg-[#080910] border border-[#1f2231] relative overflow-hidden flex flex-col items-center justify-center p-4">
            {/* Ambient Background Grid */}
            <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-40" />

            {/* Simulated 3D Face Wireframe Points */}
            <div className="relative z-10 flex flex-col items-center gap-2">
              <div className="w-24 h-32 rounded-full border border-dashed border-emerald-400/40 flex items-center justify-center relative">
                {/* Nose tip coordinate marker */}
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping absolute" />
                <div className="w-2 h-2 rounded-full bg-emerald-400 absolute" />
                {/* 3D coordinate axes simulation */}
                <div className="w-8 h-0.5 bg-red-500 absolute -top-1 -right-4 rotate-12" />
                <div className="w-0.5 h-8 bg-green-500 absolute -bottom-4 right-2" />
                <div className="w-6 h-0.5 bg-blue-500 absolute top-4 -left-4" />
              </div>
              <span className="text-[10px] font-mono text-emerald-400/80 bg-black/60 px-2 py-0.5 rounded border border-emerald-500/20">
                Face Tracking Active: Attentive Pose
              </span>
            </div>

            {/* Floating Advisory Banner */}
            <div className="absolute bottom-3 inset-x-4 flex justify-center z-10">
              <div
                className={`px-3 py-1 rounded-full text-xs font-mono font-medium border flex items-center gap-2 ${statusColor}`}
              >
                <Radio className="w-3.5 h-3.5 animate-pulse" />
                <span>{statusLabel}</span>
              </div>
            </div>
          </div>

          {/* Score Gauge Visual */}
          <div className="md:col-span-5 flex flex-col items-center justify-center p-5 rounded-xl bg-[#10121d] border border-[#1e2233]">
            <div className="relative w-36 h-36 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="transparent"
                  stroke="#1c2030"
                  strokeWidth="8"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="transparent"
                  stroke={ringColor}
                  strokeWidth="8"
                  strokeDasharray="264"
                  strokeDashoffset={264 - (264 * score) / 100}
                  strokeLinecap="round"
                  className="transition-all duration-500 ease-out"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-3xl font-extrabold text-white tracking-tighter">
                  {score}
                </span>
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">
                  Fatigue Score
                </span>
              </div>
            </div>

            <p className="text-xs font-medium text-slate-300 mt-2 text-center">
              Multi-modal temporal fusion index
            </p>
          </div>
        </div>

        {/* Telemetry Tiles Row */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          <div className="p-3 rounded-xl bg-[#10121d] border border-[#1e2233]">
            <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-mono">
              <Eye className="w-3.5 h-3.5 text-emerald-400" />
              <span>EAR (Eyes)</span>
            </div>
            <div className="text-base font-bold text-white mt-1">
              {isNominal ? "0.320" : "0.205"}
            </div>
            <div className="text-[10px] font-mono text-slate-500">
              {isNominal ? "Eyes open" : "Reduced aperture"}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#10121d] border border-[#1e2233]">
            <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-mono">
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              <span>PERCLOS (60s)</span>
            </div>
            <div className="text-base font-bold text-white mt-1">
              {isNominal ? "3.2%" : "12.8%"}
            </div>
            <div className="text-[10px] font-mono text-slate-500">
              {isNominal ? "Nominal ratio" : "Elevated closure"}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#10121d] border border-[#1e2233]">
            <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-mono">
              <Compass className="w-3.5 h-3.5 text-indigo-400" />
              <span>Head Pose</span>
            </div>
            <div className="text-base font-bold text-white mt-1">
              {isNominal ? "Pitch -1.2°" : "Pitch -12.4°"}
            </div>
            <div className="text-[10px] font-mono text-slate-500">Yaw: +0.8°</div>
          </div>

          <div className="p-3 rounded-xl bg-[#10121d] border border-[#1e2233]">
            <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-mono">
              <Eye className="w-3.5 h-3.5 text-amber-400" />
              <span>Blink Rate</span>
            </div>
            <div className="text-base font-bold text-white mt-1">
              {isNominal ? "18 / min" : "28 / min"}
            </div>
            <div className="text-[10px] font-mono text-slate-500">Avg duration 220ms</div>
          </div>

          <div className="p-3 rounded-xl bg-[#10121d] border border-[#1e2233] col-span-2 sm:col-span-1">
            <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-mono">
              <Smile className="w-3.5 h-3.5 text-purple-400" />
              <span>Mouth / Yawns</span>
            </div>
            <div className="text-base font-bold text-white mt-1">
              {isNominal ? "0 yawns" : "1 yawn"}
            </div>
            <div className="text-[10px] font-mono text-slate-500">MAR: 0.12</div>
          </div>
        </div>
      </div>
    </div>
  );
}
