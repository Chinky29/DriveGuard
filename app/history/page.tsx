"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Clock,
  Calendar,
  AlertTriangle,
  ShieldAlert,
  Download,
  Trash2,
  Play,
  RotateCcw,
  Activity,
  ChevronRight,
  TrendingUp,
} from "lucide-react";
import { formatSessionDuration } from "@/components/monitor/SessionControls";

interface SessionListItem {
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

export default function HistoryPage() {
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/sessions");
      if (!res.ok) {
        throw new Error(`Failed to load sessions (HTTP ${res.status})`);
      }
      const data = await res.json();
      setSessions(data.sessions || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleDeleteSession = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this monitoring session?")) {
      return;
    }

    try {
      const res = await fetch(`/api/sessions/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete request failed");
      setSessions((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      alert(`Could not delete session: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const getScoreBadgeColor = (score: number) => {
    if (score < 25) return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
    if (score < 50) return "text-amber-400 bg-amber-500/10 border-amber-500/20";
    return "text-red-400 bg-red-500/10 border-red-500/20";
  };

  return (
    <div className="min-h-screen bg-[#090a10] text-slate-100 flex flex-col font-sans">
      {/* Top Header */}
      <header className="w-full bg-[#10121a] border-b border-[#222533] px-4 py-3 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <Link
            href="/monitor"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            aria-label="Back to cockpit monitor"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-base font-extrabold text-white tracking-tight flex items-center gap-2">
              DriveGuard <span className="text-slate-500 font-mono text-xs">/ History</span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/monitor"
            className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs transition flex items-center gap-1.5 shadow-sm"
          >
            <Play className="w-3.5 h-3.5 fill-black" />
            <span>New Session</span>
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1e212f] pb-4">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Driver Monitoring Sessions</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Numerical telemetry history and physiological advisory events
            </p>
          </div>
          <button
            onClick={fetchSessions}
            disabled={isLoading}
            className="self-start sm:self-auto px-3 py-1.5 rounded-lg bg-[#141622] hover:bg-[#1a1d2d] border border-[#26293a] text-xs text-slate-300 flex items-center gap-1.5 transition disabled:opacity-50"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* LOADING STATE */}
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-28 rounded-xl bg-[#12141c] border border-[#202330] p-4 flex flex-col justify-between animate-pulse"
              >
                <div className="h-4 bg-slate-800 rounded w-1/3" />
                <div className="h-6 bg-slate-800 rounded w-1/2" />
                <div className="h-4 bg-slate-800 rounded w-1/4" />
              </div>
            ))}
          </div>
        )}

        {/* ERROR STATE */}
        {!isLoading && errorMessage && (
          <div className="p-6 rounded-2xl bg-red-950/20 border border-red-900/40 text-center space-y-3">
            <AlertTriangle className="w-8 h-8 text-red-400 mx-auto" />
            <h3 className="text-sm font-semibold text-red-200">Failed to load monitoring history</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">{errorMessage}</p>
            <button
              onClick={fetchSessions}
              className="px-4 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-200 text-xs font-semibold border border-red-500/30 transition"
            >
              Try Again
            </button>
          </div>
        )}

        {/* EMPTY STATE */}
        {!isLoading && !errorMessage && sessions.length === 0 && (
          <div className="py-16 px-4 rounded-2xl bg-[#11131c] border border-[#1e2230] text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
              <Clock className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">No monitoring sessions recorded yet</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Start a session from the cockpit to track driver alertness, blinks, and head orientation cues in real-time.
              </p>
            </div>
            <Link
              href="/monitor"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs tracking-wide transition shadow-lg shadow-emerald-500/10"
            >
              <Play className="w-4 h-4 fill-black" />
              <span>Start Monitoring Session</span>
            </Link>
          </div>
        )}

        {/* SESSIONS LIST */}
        {!isLoading && !errorMessage && sessions.length > 0 && (
          <div className="space-y-3">
            {sessions.map((session) => {
              const startDate = new Date(session.start_time);
              const formattedDate = startDate.toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              });
              const formattedTime = startDate.toLocaleTimeString(undefined, {
                hour: "2-digit",
                minute: "2-digit",
              });

              const totalAlerts =
                session.notice_count + session.warning_count + session.critical_count;

              return (
                <Link
                  key={session.id}
                  href={`/history/${session.id}`}
                  className="group block p-4 sm:p-5 rounded-xl bg-[#11131c] hover:bg-[#151824] border border-[#1f2231] hover:border-slate-700 transition duration-150 shadow-sm"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    {/* Left: Timing & Basic Info */}
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        <span>{formattedDate}</span>
                        <span>•</span>
                        <span>{formattedTime}</span>
                        <span>•</span>
                        <span className="font-mono text-emerald-400">
                          {formatSessionDuration(session.duration_seconds)}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-white group-hover:text-emerald-300 transition">
                          Session #{session.id.slice(0, 8)}
                        </span>
                        <div
                          className={`px-2 py-0.5 rounded text-[11px] font-mono font-medium border ${getScoreBadgeColor(
                            session.peak_fatigue_score
                          )}`}
                        >
                          Peak: {session.peak_fatigue_score}
                        </div>
                        <div className="text-[11px] font-mono text-slate-400">
                          Avg: {Number(session.avg_fatigue_score).toFixed(0)}
                        </div>
                      </div>
                    </div>

                    {/* Right: Badges, Alerts & Actions */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#1c1f2b]">
                      <div className="flex items-center gap-2">
                        {totalAlerts === 0 ? (
                          <span className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 text-[11px] font-mono">
                            0 Alerts
                          </span>
                        ) : (
                          <div className="flex items-center gap-1.5 text-[11px] font-mono">
                            {session.notice_count > 0 && (
                              <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400">
                                {session.notice_count} Notice
                              </span>
                            )}
                            {session.warning_count > 0 && (
                              <span className="px-2 py-0.5 rounded bg-orange-500/10 border border-orange-500/20 text-orange-400">
                                {session.warning_count} Warning
                              </span>
                            )}
                            {session.critical_count > 0 && (
                              <span className="px-2 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-red-400">
                                {session.critical_count} Critical
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => handleDeleteSession(e, session.id)}
                          aria-label="Delete session"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition" />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
