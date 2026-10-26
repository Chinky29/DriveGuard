"use client";

import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import {
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Clock,
  TrendingUp,
  Download,
} from "lucide-react";
import { formatSessionDuration } from "./SessionControls";

export interface SessionEventRecord {
  readonly timestampSec: number;
  readonly timeStr: string;
  readonly level: "Notice" | "Warning" | "Critical";
  readonly score: number;
  readonly reason: string;
}

export interface SessionData {
  readonly durationSeconds: number;
  readonly scoreHistory: Array<{ timeStr: string; score: number }>;
  readonly events: SessionEventRecord[];
  readonly totalFrames: number;
}

export interface SessionSummaryProps {
  readonly sessionData: SessionData;
  readonly onNewSession: () => void;
}

export function SessionSummary({
  sessionData,
  onNewSession,
}: SessionSummaryProps) {
  const { durationSeconds, scoreHistory, events } = sessionData;

  const avgScore = useMemo(() => {
    if (scoreHistory.length === 0) return 0;
    const sum = scoreHistory.reduce((acc, p) => acc + p.score, 0);
    return Math.round(sum / scoreHistory.length);
  }, [scoreHistory]);

  const peakScore = useMemo(() => {
    if (scoreHistory.length === 0) return 0;
    return Math.max(...scoreHistory.map((p) => p.score));
  }, [scoreHistory]);

  const noticeCount = useMemo(
    () => events.filter((e) => e.level === "Notice").length,
    [events]
  );
  const warningCount = useMemo(
    () => events.filter((e) => e.level === "Warning").length,
    [events]
  );
  const criticalCount = useMemo(
    () => events.filter((e) => e.level === "Critical").length,
    [events]
  );

  const handleExportCSV = () => {
    const headers = "timestamp_sec,time,level,score,reason\n";
    const rows = events
      .map(
        (e) =>
          `${e.timestampSec.toFixed(1)},${e.timeStr},${e.level},${e.score},"${e.reason.replace(/"/g, '""')}"`
      )
      .join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `driveguard_session_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      id="session-summary-container"
      className="w-full max-w-4xl mx-auto bg-[#14161f] border border-[#262936] rounded-2xl p-6 sm:p-8 text-slate-100 shadow-2xl space-y-8 animate-in fade-in duration-300"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#262936]">
        <div>
          <span className="text-xs uppercase font-bold tracking-widest text-emerald-400">
            Monitoring Session Ended
          </span>
          <h2 className="text-2xl font-extrabold text-white mt-0.5">
            Driver Alertness Summary
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Local in-memory evaluation only. Zero persistent video saved.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-1.5 transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={onNewSession}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white flex items-center gap-1.5 transition shadow-lg shadow-emerald-950"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Start New Session</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-[#0b0c12] p-4 rounded-xl border border-[#222634]">
          <span className="text-slate-400 block text-xs font-medium flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            Duration
          </span>
          <span className="text-2xl font-extrabold text-white font-mono block mt-1">
            {formatSessionDuration(durationSeconds)}
          </span>
          <span className="text-[11px] text-slate-500 block mt-0.5">Continuous active</span>
        </div>

        <div className="bg-[#0b0c12] p-4 rounded-xl border border-[#222634]">
          <span className="text-slate-400 block text-xs font-medium flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-slate-500" />
            Average Score
          </span>
          <span className="text-2xl font-extrabold text-white font-mono block mt-1">
            {avgScore}
            <span className="text-sm font-normal text-slate-500"> /100</span>
          </span>
          <span className="text-[11px] text-slate-500 block mt-0.5">Mean alertness index</span>
        </div>

        <div className="bg-[#0b0c12] p-4 rounded-xl border border-[#222634]">
          <span className="text-slate-400 block text-xs font-medium flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            Peak Score
          </span>
          <span className="text-2xl font-extrabold text-amber-400 font-mono block mt-1">
            {peakScore}
            <span className="text-sm font-normal text-slate-500"> /100</span>
          </span>
          <span className="text-[11px] text-slate-500 block mt-0.5">Highest fatigue mark</span>
        </div>

        <div className="bg-[#0b0c12] p-4 rounded-xl border border-[#222634]">
          <span className="text-slate-400 block text-xs font-medium flex items-center gap-1.5">
            <AlertOctagon className="w-3.5 h-3.5 text-red-500" />
            Total Alerts
          </span>
          <span className="text-2xl font-extrabold text-white font-mono block mt-1">
            {events.length}
          </span>
          <span className="text-[11px] text-slate-500 block mt-0.5">
            {warningCount} Warnings | {criticalCount} Critical
          </span>
        </div>
      </div>

      {/* Timeline Chart using Recharts */}
      <div className="bg-[#0b0c12] p-5 rounded-xl border border-[#222634] space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Fatigue Score Timeline
          </h3>
          <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-emerald-400" /> Normal (&lt;40)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-amber-400" /> Notice (40-64)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-orange-400" /> Warning (65+)
            </span>
          </div>
        </div>

        <div className="h-64 w-full">
          {scoreHistory.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={scoreHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="session-score-gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2ECC71" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="#2ECC71" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="timeStr" stroke="#4a5068" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} stroke="#4a5068" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#14161f",
                    borderColor: "#262936",
                    borderRadius: "8px",
                    color: "#fff",
                    fontSize: "12px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="score"
                  stroke="#2ECC71"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#session-score-gradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-500 text-xs">
              No historical samples recorded during session.
            </div>
          )}
        </div>
      </div>

      {/* Advisory Events Log */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">
          Observed Advisory Events ({events.length})
        </h3>

        {events.length === 0 ? (
          <div className="bg-[#0b0c12] p-6 rounded-xl border border-[#222634] text-center text-slate-400 text-xs">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
            <p className="font-semibold text-slate-200">Zero Fatigue Advisories Triggered</p>
            <p className="text-slate-500 mt-0.5">
              Driver alertness indicators remained within normal baseline bounds throughout the session.
            </p>
          </div>
        ) : (
          <div className="bg-[#0b0c12] rounded-xl border border-[#222634] overflow-hidden max-h-60 overflow-y-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#14161f] text-slate-400 border-b border-[#222634]">
                <tr>
                  <th className="p-3">Time</th>
                  <th className="p-3">Level</th>
                  <th className="p-3">Score</th>
                  <th className="p-3">Observable Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e2230] text-slate-300">
                {events.map((e, idx) => (
                  <tr key={idx} className="hover:bg-white/5 transition">
                    <td className="p-3 text-slate-400">{e.timeStr}</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                          e.level === "Critical"
                            ? "bg-red-950 text-red-300 border border-red-800"
                            : e.level === "Warning"
                            ? "bg-orange-950 text-orange-300 border border-orange-800"
                            : "bg-amber-950 text-amber-300 border border-amber-800"
                        }`}
                      >
                        {e.level}
                      </span>
                    </td>
                    <td className="p-3 text-white font-bold">{e.score}</td>
                    <td className="p-3 text-slate-300">{e.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
