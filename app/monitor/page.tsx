"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useUser, useAuth, UserButton } from "@clerk/nextjs";
import { CameraView, LiveMetrics } from "@/components/monitor/CameraView";
import { ScoreGauge } from "@/components/monitor/ScoreGauge";
import { MetricTileRow } from "@/components/monitor/MetricTile";
import { AlertBanner } from "@/components/monitor/AlertBanner";
import { CriticalOverlay } from "@/components/monitor/CriticalOverlay";
import { SparklineChart, ScorePoint } from "@/components/monitor/SparklineChart";
import { SessionControls, formatSessionDuration } from "@/components/monitor/SessionControls";
import { SessionSummary, SessionData, SessionEventRecord } from "@/components/monitor/SessionSummary";
import { CalibrationModal } from "@/components/calibration/CalibrationModal";
import { FooterDisclaimer } from "@/components/monitor/FooterDisclaimer";
import { FusedFatigueTracker, FatigueLevel, FatigueAssessment } from "@/lib/detection/fatigue";
import { AlertManager } from "@/lib/detection/alerts";
import { CalibratedThresholds } from "@/lib/detection/calibration";
import { DEFAULT_CONFIG } from "@/lib/detection/config";
import { EnhancedMLClient, mergeEnhancedSignal } from "@/lib/detection/enhancedService";
import { useSearchParams } from "next/navigation";
import { createClerkSupabaseClient } from "@/lib/supabase/client";
import { saveUserCalibration, loadUserCalibration } from "@/lib/supabase/calibration";
import { ClientTelemetryUploader } from "@/lib/telemetry/uploader";
import { ConsentModal } from "@/components/privacy/ConsentModal";
import {
  LayoutDashboard,
  BarChart3,
  TrendingUp,
  Sliders,
  Shield,
  ArrowLeft,
  AlertCircle,
  Cloud,
  History,
  Settings,
} from "lucide-react";

export default function MonitorPage() {
  const searchParams = useSearchParams();
  const { isLoaded: isClerkLoaded, isSignedIn, user } = useUser();
  const { getToken } = useAuth();
  // Session State
  const [sessionActive, setSessionActive] = useState<boolean>(true);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [isSummaryView, setIsSummaryView] = useState<boolean>(false);
  const [cloudSessionId, setCloudSessionId] = useState<string | null>(null);

  // Calibration State
  const [isCalibrationOpen, setIsCalibrationOpen] = useState<boolean>(false);
  const [calibratedThresholds, setCalibratedThresholds] = useState<CalibratedThresholds | null>(null);
  const [calibrationNotice, setCalibrationNotice] = useState<string | null>(null);

  // Detection & Tracking State
  const [liveMetrics, setLiveMetrics] = useState<LiveMetrics | null>(null);
  const [lightStatus, setLightStatus] = useState<"optimal" | "low">("optimal");
  const [fatigueAssessment, setFatigueAssessment] = useState<FatigueAssessment>({
    score: 0,
    level: "Normal",
    rawLevel: "Normal",
    reasons: ["Attentive - Nominal"],
    components: {
      perclosScore: 0,
      microsleepScore: 0,
      yawnScore: 0,
      nodScore: 0,
      blinkDurationScore: 0,
    },
    timestamp: 0,
    isFaceReliable: false,
  });

  // History & Events (In-memory only)
  const [scoreHistory, setScoreHistory] = useState<ScorePoint[]>([]);
  const [events, setEvents] = useState<SessionEventRecord[]>([]);

  // UI Modes & Controls
  const [isDarkTheme, setIsDarkTheme] = useState<boolean>(true);
  const [activeMobileTab, setActiveMobileTab] = useState<"cockpit" | "metrics" | "trend">("cockpit");
  const [isDebugVisible, setIsDebugVisible] = useState<boolean>(false);
  const [isAudioUnlocked, setIsAudioUnlocked] = useState<boolean>(false);
  const [isCriticalDismissed, setIsCriticalDismissed] = useState<boolean>(false);
  const [enhancedMode, setEnhancedMode] = useState<boolean>(false);

  // Engine references
  const trackerRef = useRef<FusedFatigueTracker>(new FusedFatigueTracker(DEFAULT_CONFIG));
  const alertManagerRef = useRef<AlertManager>(new AlertManager(DEFAULT_CONFIG));
  const uploaderRef = useRef<ClientTelemetryUploader>(new ClientTelemetryUploader());
  const enhancedClientRef = useRef<EnhancedMLClient>(new EnhancedMLClient());
  const cloudSessionIdRef = useRef<string | null>(null);
  const lastSampleTimeRef = useRef<number>(0);
  const lastTelemetryBatchTimeRef = useRef<number>(0);
  const previousLevelRef = useRef<FatigueLevel>("Normal");

  // Load user preferences (Enhanced Mode & URL) from local storage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("driveguard_user_settings");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.enhancedMode) {
          setEnhancedMode(true);
          enhancedClientRef.current.setEnabled(true);
        }
        if (parsed.enhancedServiceUrl) {
          enhancedClientRef.current.setServiceUrl(parsed.enhancedServiceUrl);
        }
      }
    } catch (e) {
      console.warn("[DriveGuard] Failed to load enhanced mode settings:", e);
    }
  }, []);

  // Dispatches small crop to optional Python microservice every 2s
  const handleCropCaptured = useCallback(
    (cropBase64: string, type: "eye" | "emotion") => {
      if (!enhancedMode) return;
      const now = performance.now() / 1000;
      enhancedClientRef.current.evaluateCrop(cropBase64, now, type).catch(() => {
        // Non-blocking fallback
      });
    },
    [enhancedMode]
  );

  // Check URL recalibrate parameter from Settings page
  useEffect(() => {
    if (searchParams.get("recalibrate") === "true") {
      setIsCalibrationOpen(true);
    }
  }, [searchParams]);

  // Cloud Session Initialization & Lifecycle
  useEffect(() => {
    async function initCloudSession() {
      if (!isSignedIn) return;
      try {
        const res = await fetch("/api/sessions", { method: "POST" });
        if (res.ok) {
          const data = await res.json();
          if (data.session?.id) {
            cloudSessionIdRef.current = data.session.id;
            setCloudSessionId(data.session.id);
            uploaderRef.current.setSessionId(data.session.id);
          }
        }
      } catch (err) {
        console.warn("[DriveGuard] Cloud session init error:", err);
      }
    }

    const uploader = uploaderRef.current;
    initCloudSession();

    return () => {
      uploader.destroy();
    };
  }, [isSignedIn]);

  // 1. Session Timer Effect
  useEffect(() => {
    if (!sessionActive || isPaused || isSummaryView) return;

    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [sessionActive, isPaused, isSummaryView]);

  // 2. Audio Unlock Handler
  const handleUnlockAudio = useCallback(() => {
    const unlocked = alertManagerRef.current.unlockAudio();
    setIsAudioUnlocked(unlocked);
  }, []);

  // 3. Process incoming frame metrics through Fused Fatigue Engine and Alert Manager
  const handleMetricsUpdate = useCallback(
    (metrics: LiveMetrics) => {
      if (!sessionActive || isPaused) return;

      setLiveMetrics(metrics);
      const now = performance.now() / 1000;

      // Update multi-modal fused fatigue engine
      let assessment = trackerRef.current.update({
        timestamp: now,
        isFaceReliable: metrics.isFaceReliable,
        perclos: metrics.perclos,
        blinkDurationSeconds: metrics.isEyeClosed ? 0.6 : 0.2,
        yawnRatePerMinute:
          metrics.blinkRate > 0
            ? metrics.yawnCount / (metrics.blinkRate / 20 || 1)
            : metrics.yawnCount,
        isYawning: metrics.isYawning,
        nodCount: metrics.nodCount,
        isNodding: metrics.isNodding,
        microsleepCount: metrics.microsleepCount,
        isMicrosleep: metrics.isMicrosleep,
      });

      // Merge secondary weak signal if Enhanced Mode is active (max 8% score impact)
      if (enhancedMode) {
        assessment = mergeEnhancedSignal(
          assessment,
          enhancedClientRef.current.getLastResult()
        );
      }

      setFatigueAssessment(assessment);

      // Evaluate alert dispatch and cooldowns
      const alertResult = alertManagerRef.current.evaluate(
        assessment.level,
        metrics.isFaceReliable,
        now,
        assessment.reasons
      );

      // Reset critical overlay dismissal when level de-escalates
      if (assessment.level !== "Critical") {
        setIsCriticalDismissed(false);
      }

      // Record event log on alert trigger or state transition
      if (alertResult.triggered || assessment.level !== previousLevelRef.current) {
        if (assessment.level !== "Normal" && assessment.level !== previousLevelRef.current) {
          const timeStr = formatSessionDuration(elapsedSeconds);
          const reasonStr = assessment.reasons.join(", ") || assessment.level;
          setEvents((prev) => [
            {
              timestampSec: now,
              timeStr,
              level: assessment.level as "Notice" | "Warning" | "Critical",
              score: assessment.score,
              reason: reasonStr,
            },
            ...prev.slice(0, 49), // retain up to 50 in-memory events
          ]);

          // Asynchronously queue event to non-blocking client uploader
          if (cloudSessionIdRef.current) {
            uploaderRef.current.queueEvent({
              timestampSec: now,
              level: assessment.level as "Notice" | "Warning" | "Critical",
              score: assessment.score,
              reason: reasonStr,
            });
          }
        }
        previousLevelRef.current = assessment.level;
      }

      // Record 10-minute sparkline samples every 2 seconds
      if (now - lastSampleTimeRef.current >= 2.0) {
        lastSampleTimeRef.current = now;
        const timeStr = formatSessionDuration(elapsedSeconds);
        setScoreHistory((prev) => [
          ...prev.slice(-180), // keep last 180 points (6 minutes at 2s interval)
          { time: timeStr, score: assessment.score },
        ]);
      }

      // Non-blocking telemetry batch queue (every 1.0 second)
      if (cloudSessionIdRef.current && now - lastTelemetryBatchTimeRef.current >= 1.0) {
        lastTelemetryBatchTimeRef.current = now;
        uploaderRef.current.queueMetricPoint({
          timestampSec: now,
          fatigueScore: assessment.score,
          ear: metrics.ear,
          mar: metrics.mar,
          pitch: metrics.pitch,
          yaw: metrics.yaw,
          roll: metrics.roll,
          perclos: metrics.perclos,
        });
      }
    },
    [sessionActive, isPaused, elapsedSeconds, enhancedMode]
  );

  // Actions
  const handleAcknowledgeCritical = useCallback(() => {
    setIsCriticalDismissed(true);
    alertManagerRef.current.reset();
    handleUnlockAudio();
  }, [handleUnlockAudio]);

  // 4. Keyboard Shortcuts: Space/Enter acknowledges critical overlay, D toggles debug, P pauses
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === "d" || e.key === "D") {
        setIsDebugVisible((prev) => !prev);
      } else if (e.key === "p" || e.key === "P") {
        setIsPaused((prev) => !prev);
      } else if (e.code === "Space" && fatigueAssessment.level === "Critical") {
        e.preventDefault();
        handleAcknowledgeCritical();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [fatigueAssessment.level, handleAcknowledgeCritical]);

  const handleEndSession = async () => {
    setIsPaused(true);
    setIsSummaryView(true);

    if (cloudSessionIdRef.current) {
      const peak = scoreHistory.reduce((max, s) => Math.max(max, s.score), 0);
      const avg =
        scoreHistory.length > 0
          ? scoreHistory.reduce((sum, s) => sum + s.score, 0) / scoreHistory.length
          : 0;
      const notices = events.filter((e) => e.level === "Notice").length;
      const warnings = events.filter((e) => e.level === "Warning").length;
      const criticals = events.filter((e) => e.level === "Critical").length;

      try {
        await fetch(`/api/sessions/${cloudSessionIdRef.current}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            endTime: new Date().toISOString(),
            durationSeconds: elapsedSeconds,
            avgFatigueScore: Math.round(avg),
            peakFatigueScore: peak,
            noticeCount: notices,
            warningCount: warnings,
            criticalCount: criticals,
          }),
        });
        await uploaderRef.current.flush();
      } catch (e) {
        console.warn("[DriveGuard] Failed to finalize cloud session:", e);
      }
    }
  };

  const handleStartNewSession = async () => {
    trackerRef.current.reset();
    alertManagerRef.current.reset();
    uploaderRef.current.destroy();
    setElapsedSeconds(0);
    setScoreHistory([]);
    setEvents([]);
    setIsPaused(false);
    setIsSummaryView(false);
    setSessionActive(true);
    previousLevelRef.current = "Normal";

    if (isSignedIn) {
      try {
        const res = await fetch("/api/sessions", { method: "POST" });
        if (res.ok) {
          const data = await res.json();
          if (data.session?.id) {
            cloudSessionIdRef.current = data.session.id;
            setCloudSessionId(data.session.id);
            uploaderRef.current.setSessionId(data.session.id);
          }
        }
      } catch (e) {
        console.warn("[DriveGuard] Session re-init error:", e);
      }
    }
  };

  // Load saved driver calibration from Supabase on user sign-in
  useEffect(() => {
    async function loadCloudCalibration() {
      if (!isSignedIn || !user) return;
      try {
        const token = await getToken({ template: "supabase" });
        const client = createClerkSupabaseClient(token);
        const saved = await loadUserCalibration(client, user.id);
        if (saved) {
          setCalibratedThresholds(saved);
          setCalibrationNotice(null);
        }
      } catch (err) {
        console.warn("[DriveGuard] Cloud calibration fetch:", err);
      }
    }
    loadCloudCalibration();
  }, [isSignedIn, user, getToken]);

  const handleCalibrationComplete = async (thresholds: CalibratedThresholds) => {
    setCalibratedThresholds(thresholds);
    setCalibrationNotice(null);
    setIsCalibrationOpen(false);

    if (isSignedIn && user) {
      try {
        const token = await getToken({ template: "supabase" });
        const client = createClerkSupabaseClient(token);
        await saveUserCalibration(
          client,
          user.id,
          thresholds,
          user.primaryEmailAddress?.emailAddress
        );
      } catch (err) {
        console.warn("[DriveGuard] Failed to sync calibration to cloud:", err);
      }
    }
  };

  const handleCalibrationSkip = async (defaults: CalibratedThresholds) => {
    setCalibratedThresholds(defaults);
    setCalibrationNotice("Calibration skipped — Factory default thresholds in effect.");
    setIsCalibrationOpen(false);

    if (isSignedIn && user) {
      try {
        const token = await getToken({ template: "supabase" });
        const client = createClerkSupabaseClient(token);
        await saveUserCalibration(
          client,
          user.id,
          defaults,
          user.primaryEmailAddress?.emailAddress
        );
      } catch (err) {
        console.warn("[DriveGuard] Failed to sync default calibration to cloud:", err);
      }
    }
  };

  // Prepare session summary data
  const summaryData: SessionData = {
    durationSeconds: elapsedSeconds,
    scoreHistory: scoreHistory.map((s) => ({ timeStr: s.time, score: s.score })),
    events,
    totalFrames: elapsedSeconds * 20,
  };

  return (
    <div
      className={`min-h-screen flex flex-col font-sans transition-colors duration-200 ${
        isDarkTheme ? "bg-[#090a10] text-slate-100 dark" : "bg-slate-100 text-slate-900 light"
      }`}
    >
      {/* Top Application Bar */}
      <header className="w-full bg-[#10121a] dark:bg-[#10121a] light:bg-white border-b border-[#222533] dark:border-[#222533] light:border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            aria-label="Back to home"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <h1 className="text-base font-extrabold text-white dark:text-white light:text-slate-900 tracking-tight">
              DriveGuard <span className="text-slate-500 font-mono text-xs">/ Cockpit</span>
            </h1>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2.5 text-xs">
          {calibrationNotice && (
            <span className="hidden md:inline-flex items-center gap-1 px-2.5 py-1 rounded bg-amber-950/60 border border-amber-800/80 text-amber-300 font-mono text-[11px]">
              <AlertCircle className="w-3.5 h-3.5" />
              {calibrationNotice}
            </span>
          )}

          <Link
            href="/history"
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition"
            title="Monitoring History"
          >
            <History className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">History</span>
          </Link>

          <Link
            href="/settings"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium flex items-center transition"
            title="Settings"
          >
            <Settings className="w-3.5 h-3.5 text-slate-400 hover:text-white" />
          </Link>

          <button
            onClick={() => setIsCalibrationOpen(true)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition"
          >
            <Sliders className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Calibrate</span>
          </button>

          {/* Clerk User Button */}
          {isSignedIn && (
            <div className="flex items-center pl-1 border-l border-[#262a3a]">
              <UserButton afterSignOutUrl="/" />
            </div>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 flex flex-col gap-5">
        {/* If in Session Summary View */}
        {isSummaryView ? (
          <SessionSummary
            sessionData={summaryData}
            onNewSession={handleStartNewSession}
          />
        ) : (
          <>
            {/* Top Alert Banner for Notice / Warning */}
            <AlertBanner
              level={fatigueAssessment.level}
              reasons={fatigueAssessment.reasons}
            />

            {/* Session Controls Header Row */}
            <SessionControls
              elapsedSeconds={elapsedSeconds}
              isPaused={isPaused}
              isFaceReliable={fatigueAssessment.isFaceReliable}
              lightStatus={lightStatus}
              isAudioUnlocked={isAudioUnlocked}
              isDebugVisible={isDebugVisible}
              isDarkTheme={isDarkTheme}
              onTogglePause={() => setIsPaused((prev) => !prev)}
              onEndSession={handleEndSession}
              onOpenCalibration={() => setIsCalibrationOpen(true)}
              onUnlockAudio={handleUnlockAudio}
              onToggleDebug={() => setIsDebugVisible((prev) => !prev)}
              onToggleTheme={() => setIsDarkTheme((prev) => !prev)}
            />

            {/* Cockpit Layout: Responsive Grid (Camera on left, Gauge + Trend on right) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Left Column: Camera Viewport (7 Cols) */}
              <div
                className={`lg:col-span-7 flex flex-col gap-4 ${
                  activeMobileTab !== "cockpit" ? "hidden lg:flex" : "flex"
                }`}
              >
                <div className="w-full bg-[#10121a] border border-[#222533] rounded-2xl overflow-hidden shadow-xl p-3 flex flex-col items-center">
                  <CameraView
                    initialDebugOverlay={false}
                    showRawTelemetryDebug={isDebugVisible}
                    isPaused={isPaused}
                    enhancedModeEnabled={enhancedMode}
                    onCropCaptured={handleCropCaptured}
                    onMetricsUpdate={handleMetricsUpdate}
                    onBrightnessDetected={(lux) => setLightStatus(lux)}
                  />
                </div>
              </div>

              {/* Right Column: Score Gauge & Real-Time Trend (5 Cols) */}
              <div
                className={`lg:col-span-5 flex flex-col gap-5 ${
                  activeMobileTab === "trend"
                    ? "flex"
                    : activeMobileTab === "cockpit"
                    ? "flex"
                    : "hidden lg:flex"
                }`}
              >
                {/* Score Gauge Card */}
                <div className="bg-[#10121a] border border-[#222533] rounded-2xl p-5 shadow-xl flex flex-col items-center justify-center relative">
                  <div className="w-full flex items-center justify-between border-b border-[#222533] pb-3 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-emerald-400" />
                      Live Alertness Index
                      {enhancedMode && (
                        <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono font-normal">
                          Enhanced ML
                        </span>
                      )}
                    </span>
                    <span className="text-[11px] font-mono text-slate-500">
                      Weighted Fusion (0-100)
                    </span>
                  </div>

                  <ScoreGauge
                    score={fatigueAssessment.score}
                    level={fatigueAssessment.level}
                    isFaceReliable={fatigueAssessment.isFaceReliable}
                    size={220}
                  />

                  {/* Active Explanation Reasons */}
                  <div className="w-full mt-2 pt-3 border-t border-[#222533] flex flex-wrap items-center justify-center gap-1.5">
                    {fatigueAssessment.reasons.map((r, i) => (
                      <span
                        key={i}
                        className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#0b0c12] border border-[#262a3a] text-slate-300 font-mono"
                      >
                        {r}
                      </span>
                    ))}
                  </div>
                </div>

                {/* 10-Minute Sparkline Trend */}
                <SparklineChart history={scoreHistory} height={80} />
              </div>
            </div>

            {/* Metric Tile Row: Always visible or on metrics tab */}
            <div
              className={`w-full ${
                activeMobileTab !== "metrics" && activeMobileTab !== "cockpit"
                  ? "hidden lg:block"
                  : "block"
              }`}
            >
              <MetricTileRow
                ear={liveMetrics?.ear ?? 0.0}
                isEyeClosed={liveMetrics?.isEyeClosed ?? false}
                isMicrosleep={liveMetrics?.isMicrosleep ?? false}
                yawnCount={liveMetrics?.yawnCount ?? 0}
                isYawning={liveMetrics?.isYawning ?? false}
                yawnRate={liveMetrics?.blinkRate ? liveMetrics.yawnCount / 2 : 0}
                pitch={liveMetrics?.pitch ?? 0.0}
                yaw={liveMetrics?.yaw ?? 0.0}
                nodCount={liveMetrics?.nodCount ?? 0}
                isNodding={liveMetrics?.isNodding ?? false}
                blinkRate={liveMetrics?.blinkRate ?? 0.0}
                blinkCount={liveMetrics?.blinkCount ?? 0}
                perclos={liveMetrics?.perclos ?? 0.0}
                isFaceReliable={fatigueAssessment.isFaceReliable}
              />
            </div>
          </>
        )}
      </main>

      {/* Critical Alert Overlay */}
      <CriticalOverlay
        isOpen={fatigueAssessment.level === "Critical" && !isCriticalDismissed}
        reasons={fatigueAssessment.reasons}
        onAcknowledge={handleAcknowledgeCritical}
      />

      {/* Driver Calibration Modal */}
      <CalibrationModal
        isOpen={isCalibrationOpen}
        currentEAR={liveMetrics?.ear ?? 0.3}
        currentMAR={liveMetrics?.mar ?? 0.15}
        isFaceReliable={fatigueAssessment.isFaceReliable}
        onComplete={handleCalibrationComplete}
        onSkip={handleCalibrationSkip}
        onClose={() => setIsCalibrationOpen(false)}
      />

      {/* Mobile Bottom Tab Bar */}
      <nav
        aria-label="Mobile Navigation"
        className="lg:hidden fixed bottom-0 inset-x-0 bg-[#10121a] border-t border-[#222533] px-6 py-2 flex items-center justify-around z-30 shadow-lg"
      >
        <button
          onClick={() => setActiveMobileTab("cockpit")}
          className={`flex flex-col items-center gap-1 text-[10px] font-semibold transition ${
            activeMobileTab === "cockpit" ? "text-emerald-400" : "text-slate-400"
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span>Cockpit</span>
        </button>

        <button
          onClick={() => setActiveMobileTab("metrics")}
          className={`flex flex-col items-center gap-1 text-[10px] font-semibold transition ${
            activeMobileTab === "metrics" ? "text-emerald-400" : "text-slate-400"
          }`}
        >
          <BarChart3 className="w-5 h-5" />
          <span>Metrics</span>
        </button>

        <button
          onClick={() => setActiveMobileTab("trend")}
          className={`flex flex-col items-center gap-1 text-[10px] font-semibold transition ${
            activeMobileTab === "trend" ? "text-emerald-400" : "text-slate-400"
          }`}
        >
          <TrendingUp className="w-5 h-5" />
          <span>Trend</span>
        </button>
      </nav>

      {/* Privacy Consent Modal (Rule 3) */}
      <ConsentModal />

      {/* Footer Disclaimer */}
      <FooterDisclaimer />
    </div>
  );
}
