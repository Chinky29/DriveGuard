"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Download,
  AlertTriangle,
  ShieldAlert,
  Trash2,
  TrendingUp,
  Activity,
  FileSpreadsheet,
  FileCode,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import { formatSessionDuration } from "@/components/monitor/SessionControls";

interface SessionDetail {
  id: string;
  user_id: string;
  start_time: string;
  end_time: string | null;
  duration_seconds: number;
  avg_fatigue_score: number;
  peak_fatigue_score: number;
  notice_count: number;
  warning_count: number;
  critical_count: number;
  created_at: string;
}

interface EventDetail {
  id: string;
  session_id: string;
  timestamp_sec: number;
  level: "Notice" | "Warning" | "Critical";
  score: number;
  reason: string;
  created_at: string;
}

export default function SessionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;

  const [session, setSession] = useState<SessionDetail | null>(null);
  const [events, setEvents] = useState<EventDetail[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchSessionDetails = useCallback(async () => {
    if (!sessionId) return;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/sessions/${sessionId}`);
      if (!res.ok) {
        if (res.status === 404) throw new Error("Monitoring session not found");
        throw new Error(`Failed to load session details (HTTP ${res.status})`);
      }
      const data = await res.json();
      setSession(data.session);
      setEvents(data.events || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchSessionDetails();
  }, [fetchSessionDetails]);

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this session and its telemetry log?")) {
      return;
    }
    try {
      const res = await fetch(`/api/sessions/${sessionId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      router.push("/history");
    } catch (err) {
      alert(`Error deleting session: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // Generate synthetic trend points from events for the chart if raw points are sparse
  const chartData = events.map((e) => ({
    time: formatSessionDuration(Math.round(e.timestamp_sec)),
    score: e.score,
    level: e.level,
  }));

  const getLevelBadge = (level: string) => {
    switch (level) {
      case "Critical":
        return "bg-red-500/10 text-red-400 border border-red-500/20";
      case "Warning":
        return "bg-orange-500/10 text-orange-400 border border-orange-500/20";
      case "Notice":
      default:
        return "bg-amber-500/10 text-amber-400 border border-amber-500/20";
    }
  };

  return (
    <div className="min-h-screen bg-[#090a10] text-slate-100 flex flex-col font-sans">
      {/* Top Application Bar */}
      <header className="w-full bg-[#10121a] border-b border-[#222533] px-4 py-3 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <Link
            href="/history"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            aria-label="Back to sessions history"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-base font-extrabold text-white tracking-tight flex items-center gap-2">
              DriveGuard <span className="text-slate-500 font-mono text-xs">/ Session Detail</span>
            </h1>
          </div>
        </div>

        {session && (
          <div className="flex items-center gap-2">
            <a
              href={`/api/sessions/${sessionId}/export?format=csv`}
              download
              className="px-2.5 py-1.5 rounded-lg bg-[#151824] hover:bg-[#1c2030] border border-[#2a2d3e] text-slate-200 text-xs font-medium flex items-center gap-1.5 transition"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Export CSV</span>
            </a>
            <a
              href={`/api/sessions/${sessionId}/export?format=json`}
              download
              className="px-2.5 py-1.5 rounded-lg bg-[#151824] hover:bg-[#1c2030] border border-[#2a2d3e] text-slate-200 text-xs font-medium flex items-center gap-1.5 transition"
            >
              <FileCode className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Export JSON</span>
            </a>
            <button
              onClick={handleDelete}
              aria-label="Delete session"
              className="p-1.5 rounded-lg bg-red-950/30 hover:bg-red-900/40 text-red-400 border border-red-900/40 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* LOADING STATE */}
        {isLoading && (
          <div className="space-y-4">
            <div className="h-28 rounded-2xl bg-[#12141c] border border-[#202330] animate-pulse" />
            <div className="h-64 rounded-2xl bg-[#12141c] border border-[#202330] animate-pulse" />
          </div>
        )}

        {/* ERROR STATE */}
        {!isLoading && errorMessage && (
          <div className="p-8 rounded-2xl bg-red-950/20 border border-red-900/40 text-center space-y-3">
            <AlertTriangle className="w-8 h-8 text-red-400 mx-auto" />
            <h3 className="text-sm font-semibold text-red-200">Session Load Error</h3>
            <p className="text-xs text-slate-400">{errorMessage}</p>
            <Link
              href="/history"
              className="inline-flex px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition"
            >
              Back to History
            </Link>
          </div>
        )}

        {/* SESSION CONTENT */}
        {!isLoading && session && (
          <>
            {/* Header Title & Date */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1e212f] pb-4">
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight">
                  Session #{session.id.slice(0, 8)}
                </h2>
                <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <span>{new Date(session.start_time).toLocaleString()}</span>
                  <span>•</span>
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span className="font-mono text-emerald-400">
                    Duration: {formatSessionDuration(session.duration_seconds)}
                  </span>
                </div>
              </div>
            </div>

            {/* Metric KPI Tiles */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-xl bg-[#12141d] border border-[#202332]">
                <div className="text-[11px] font-mono text-slate-400 uppercase">Avg Fatigue</div>
                <div className="text-2xl font-bold text-white mt-1">
                  {Number(session.avg_fatigue_score).toFixed(0)}
                  <span className="text-xs text-slate-500 font-normal"> / 100</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#12141d] border border-[#202332]">
                <div className="text-[11px] font-mono text-slate-400 uppercase">Peak Fatigue</div>
                <div
                  className={`text-2xl font-bold mt-1 ${
                    session.peak_fatigue_score >= 50 ? "text-red-400" : "text-amber-400"
                  }`}
                >
                  {session.peak_fatigue_score}
                  <span className="text-xs text-slate-500 font-normal"> / 100</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#12141d] border border-[#202332]">
                <div className="text-[11px] font-mono text-slate-400 uppercase">Total Alerts</div>
                <div className="text-2xl font-bold text-white mt-1">
                  {session.notice_count + session.warning_count + session.critical_count}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#12141d] border border-[#202332]">
                <div className="text-[11px] font-mono text-slate-400 uppercase">Alert Breakdown</div>
                <div className="text-xs font-mono text-slate-300 mt-2 space-y-0.5">
                  <div>Notices: {session.notice_count}</div>
                  <div>Warnings: {session.warning_count}</div>
                  <div className="text-red-400">Critical: {session.critical_count}</div>
                </div>
              </div>
            </div>

            {/* Timeline Chart */}
            <div className="p-5 rounded-2xl bg-[#12141d] border border-[#202332] space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-bold text-white">Fatigue Trend Timeline</h3>
                </div>
                <span className="text-[11px] font-mono text-slate-400">
                  {chartData.length} recorded events
                </span>
              </div>

              {chartData.length > 0 ? (
                <div className="h-60 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#222533" vertical={false} />
                      <XAxis
                        dataKey="time"
                        stroke="#64748b"
                        fontSize={10}
                        tickLine={false}
                        axisLine={{ stroke: "#222533" }}
                      />
                      <YAxis
                        domain={[0, 100]}
                        stroke="#64748b"
                        fontSize={10}
                        tickLine={false}
                        axisLine={{ stroke: "#222533" }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#181a26",
                          border: "1px solid #2e3245",
                          borderRadius: "8px",
                          fontSize: "11px",
                          color: "#f1f5f9",
                        }}
                      />
                      <ReferenceLine y={25} stroke="#f59e0b" strokeDasharray="2 2" />
                      <ReferenceLine y={50} stroke="#ef4444" strokeDasharray="2 2" />
                      <Line
                        type="monotone"
                        dataKey="score"
                        stroke="#10b981"
                        strokeWidth={2}
                        dot={{ r: 3, fill: "#10b981" }}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-32 flex items-center justify-center text-xs text-slate-500 font-mono">
                  Attentive throughout session (no elevated advisory thresholds exceeded)
                </div>
              )}
            </div>

            {/* Physiological Events Table */}
            <div className="p-5 rounded-2xl bg-[#12141d] border border-[#202332] space-y-4">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Physiological Advisory Events Log</h3>
              </div>

              {events.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#202332] text-slate-400 font-mono text-[11px]">
                        <th className="py-2.5 px-3">Time</th>
                        <th className="py-2.5 px-3">Level</th>
                        <th className="py-2.5 px-3">Score</th>
                        <th className="py-2.5 px-3">Observable Physiological Cause (Rule 1)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1b1e2c]">
                      {events.map((event) => (
                        <tr key={event.id} className="hover:bg-slate-800/30 transition">
                          <td className="py-2.5 px-3 font-mono text-slate-400">
                            {formatSessionDuration(Math.round(event.timestamp_sec))}
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-mono ${getLevelBadge(
                                event.level
                              )}`}
                            >
                              {event.level}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-white">
                            {event.score}
                          </td>
                          <td className="py-2.5 px-3 text-slate-300 font-medium">
                            {event.reason}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-slate-500 py-4 text-center">
                  No physiological advisory events logged for this session. Attentive state maintained.
                </p>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
