"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useUser, UserButton } from "@clerk/nextjs";
import {
  ShieldCheck,
  VideoOff,
  Activity,
  Sliders,
  LineChart,
  FileSpreadsheet,
  CheckCircle2,
  Lock,
  Compass,
  Eye,
  AlertTriangle,
  Play,
  Sun,
  Moon,
  ArrowRight,
  ShieldAlert,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { CockpitPreview } from "@/components/landing/CockpitPreview";
import { FooterDisclaimer } from "@/components/monitor/FooterDisclaimer";

export default function LandingPage() {
  const { isSignedIn } = useUser();
  const [isDarkTheme, setIsDarkTheme] = useState<boolean>(true);

  useEffect(() => {
    try {
      const storedTheme = localStorage.getItem("driveguard_theme");
      if (storedTheme === "light") {
        setIsDarkTheme(false);
      }
    } catch {
      // Ignore localStorage access failures
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = !isDarkTheme;
    setIsDarkTheme(nextTheme);
    try {
      localStorage.setItem("driveguard_theme", nextTheme ? "dark" : "light");
    } catch {
      // Ignore
    }
  };

  return (
    <div
      className={`min-h-screen flex flex-col font-sans transition-colors duration-200 ${
        isDarkTheme ? "bg-[#080910] text-slate-100 dark" : "bg-slate-50 text-slate-900 light"
      }`}
    >
      {/* 1. Global Navigation Bar */}
      <header
        className={`w-full border-b sticky top-0 z-40 backdrop-blur-md transition-colors ${
          isDarkTheme
            ? "bg-[#0b0d17]/80 border-[#1f2231]"
            : "bg-white/80 border-slate-200"
        }`}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 group-hover:scale-125 transition-transform" />
            <span className="font-extrabold text-base tracking-tight text-white dark:text-white light:text-slate-900">
              DriveGuard
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-medium">
              Edge AI
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-400">
            <a href="#features" className="hover:text-white transition">
              Features
            </a>
            <a href="#how-it-works" className="hover:text-white transition">
              How It Works
            </a>
            <a href="#privacy" className="hover:text-white transition">
              Privacy Guarantee
            </a>
            <Link href="/history" className="hover:text-white transition">
              History
            </Link>
          </nav>

          {/* Right Header CTAs & Theme Toggle */}
          <div className="flex items-center gap-2.5">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              aria-label="Toggle display theme"
              className={`p-2 rounded-xl border text-xs transition ${
                isDarkTheme
                  ? "bg-[#141624] border-[#222538] text-slate-300 hover:text-white"
                  : "bg-slate-100 border-slate-300 text-slate-700 hover:text-black"
              }`}
            >
              {isDarkTheme ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {isSignedIn ? (
              <div className="flex items-center gap-3">
                <Link
                  href="/monitor"
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition flex items-center gap-1.5 shadow-sm shadow-emerald-500/10"
                >
                  <Play className="w-3.5 h-3.5 fill-black" />
                  <span>Open Cockpit</span>
                </Link>
                <UserButton afterSignOutUrl="/" />
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/sign-in"
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white transition"
                >
                  Sign In
                </Link>
                <Link
                  href="/monitor"
                  className="px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition flex items-center gap-1.5 shadow-sm shadow-emerald-500/10"
                >
                  <span>Launch Cockpit</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* 2. Hero Section */}
        <section className="relative pt-12 pb-20 px-4 sm:px-6 overflow-hidden">
          {/* Subtle Ambient Light Gradients */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />

          <div className="max-w-5xl mx-auto text-center space-y-6 relative z-10">
            {/* Tagline Pill */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>EDGE-FIRST DRIVER-STATE MONITORING • CLIENT WEBASSEMBLY</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white dark:text-white light:text-slate-900 max-w-4xl mx-auto leading-tight">
              Real-time driver alertness cues.{" "}
              <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
                Pure local edge intelligence.
              </span>
            </h1>

            {/* Subheading */}
            <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
              DriveGuard evaluates facial landmarks, continuous eye closure (PERCLOS), and head orientation directly inside your browser. Zero cloud video streaming. Zero raw video frames stored.
            </p>

            {/* CTA Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/monitor"
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-sm tracking-wide transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
              >
                <Play className="w-4 h-4 fill-black" />
                <span>Launch Cockpit Monitor</span>
              </Link>
              <Link
                href="/history"
                className={`w-full sm:w-auto px-6 py-3 rounded-xl border font-semibold text-sm transition flex items-center justify-center gap-2 ${
                  isDarkTheme
                    ? "bg-[#121420] border-[#25283c] text-slate-200 hover:bg-[#181b2a]"
                    : "bg-white border-slate-300 text-slate-800 hover:bg-slate-100"
                }`}
              >
                <span>View Session History</span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </Link>
            </div>

            {/* Product Screenshot / Interactive Cockpit Mockup */}
            <div className="pt-10">
              <CockpitPreview />
            </div>
          </div>
        </section>

        {/* 3. Three Feature Cards Section */}
        <section
          id="features"
          className={`py-16 px-4 sm:px-6 border-t ${
            isDarkTheme ? "bg-[#0b0c16] border-[#1b1e2c]" : "bg-slate-100 border-slate-200"
          }`}
        >
          <div className="max-w-5xl mx-auto space-y-10">
            <div className="text-center space-y-2">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white dark:text-white light:text-slate-900">
                Engineered for Reliability & Privacy
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
                No black-box guesses. Only deterministic geometric algorithms, calibrated temporal sliding windows, and observable physiological metrics.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Feature 1: Fused Score */}
              <div
                className={`p-6 rounded-2xl border flex flex-col justify-between space-y-4 transition hover:-translate-y-1 duration-200 ${
                  isDarkTheme
                    ? "bg-[#11131e] border-[#1e2233]"
                    : "bg-white border-slate-200 shadow-sm"
                }`}
              >
                <div className="space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <Activity className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-white dark:text-white light:text-slate-900">
                    Multi-Modal Fused Scoring
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Combines 60-second sliding-window PERCLOS, continuous blink duration, microsleep timing, yawn rates, and head pose deviation with temporal hysteresis to suppress false alarms.
                  </p>
                </div>
                <div className="pt-3 border-t border-[#1b1f2e] text-[11px] font-mono text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Observable physiological cues</span>
                </div>
              </div>

              {/* Feature 2: Private by Design */}
              <div
                className={`p-6 rounded-2xl border flex flex-col justify-between space-y-4 transition hover:-translate-y-1 duration-200 ${
                  isDarkTheme
                    ? "bg-[#11131e] border-[#1e2233]"
                    : "bg-white border-slate-200 shadow-sm"
                }`}
              >
                <div className="space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
                    <VideoOff className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-white dark:text-white light:text-slate-900">
                    Private by Design (Rule 3)
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Zero video persistence. All 468+ facial landmarks are extracted inside browser WebAssembly GPU memory. Camera frames never leave your machine. Only anonymous numerical telemetry is recorded.
                  </p>
                </div>
                <div className="pt-3 border-t border-[#1b1f2e] text-[11px] font-mono text-cyan-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>No raw frames stored on disk</span>
                </div>
              </div>

              {/* Feature 3: Trip Insights */}
              <div
                className={`p-6 rounded-2xl border flex flex-col justify-between space-y-4 transition hover:-translate-y-1 duration-200 ${
                  isDarkTheme
                    ? "bg-[#11131e] border-[#1e2233]"
                    : "bg-white border-slate-200 shadow-sm"
                }`}
              >
                <div className="space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
                    <LineChart className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-white dark:text-white light:text-slate-900">
                    Session Analytics & Trip Insights
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Comprehensive session timeline sparklines, physiological alert event logs, and instant RFC 4180 CSV / JSON downloads protected by PostgreSQL Row Level Security.
                  </p>
                </div>
                <div className="pt-3 border-t border-[#1b1f2e] text-[11px] font-mono text-purple-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Instant CSV & JSON export</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 4. How It Works in 3 Steps */}
        <section id="how-it-works" className="py-20 px-4 sm:px-6">
          <div className="max-w-5xl mx-auto space-y-12">
            <div className="text-center space-y-2">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white dark:text-white light:text-slate-900">
                How It Works in 3 Steps
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
                Simple, browser-native workflow that starts monitoring in under 30 seconds
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
              {/* Step 1 */}
              <div className="space-y-3 text-center sm:text-left">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono font-bold flex items-center justify-center text-sm mx-auto sm:mx-0">
                  01
                </div>
                <h3 className="text-base font-bold text-white dark:text-white light:text-slate-900">
                  20-Second Baseline Calibration
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Position your webcam and look naturally ahead. DriveGuard collects your resting Eye Aspect Ratio (EAR) and mouth aperture with median-based outlier rejection.
                </p>
              </div>

              {/* Step 2 */}
              <div className="space-y-3 text-center sm:text-left">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono font-bold flex items-center justify-center text-sm mx-auto sm:mx-0">
                  02
                </div>
                <h3 className="text-base font-bold text-white dark:text-white light:text-slate-900">
                  Continuous Landmark Ingestion
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  MediaPipe FaceLandmarker tracks 468 3D landmarks at 18–20 FPS. If your face is occluded or turned away, the Reliability Guard immediately pauses decisions to prevent false alarms.
                </p>
              </div>

              {/* Step 3 */}
              <div className="space-y-3 text-center sm:text-left">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono font-bold flex items-center justify-center text-sm mx-auto sm:mx-0">
                  03
                </div>
                <h3 className="text-base font-bold text-white dark:text-white light:text-slate-900">
                  Graded Physiological Advisories
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Notice, Warning, and Critical alerts are dispatched with subtle audio chimes, tactile haptics, and cockpit overlays. All events describe observable causes like prolonged eye closure.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 5. Privacy Note & Data Guarantee Card */}
        <section
          id="privacy"
          className={`py-16 px-4 sm:px-6 border-y ${
            isDarkTheme ? "bg-[#0c0e18] border-[#1b1f2e]" : "bg-slate-100 border-slate-200"
          }`}
        >
          <div className="max-w-4xl mx-auto p-6 sm:p-8 rounded-3xl border border-emerald-500/20 bg-gradient-to-b from-emerald-950/20 to-transparent space-y-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shrink-0">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-white dark:text-white light:text-slate-900">
                  Our Strict Privacy Promise (Rule 3 Compliance)
                </h3>
                <p className="text-xs text-slate-400">
                  DriveGuard was architected from day one around the fundamental premise that driver monitoring should never compromise personal privacy.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 rounded-xl bg-[#080910] border border-[#1b1f2e] space-y-1">
                <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <VideoOff className="w-4 h-4 text-emerald-400" />
                  <span>Zero Video Storage</span>
                </div>
                <p className="text-slate-400 leading-relaxed">
                  Raw camera frames are processed exclusively in volatile device RAM and discarded immediately. No photos, videos, or camera streams are ever transmitted or written to disk.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#080910] border border-[#1b1f2e] space-y-1">
                <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-cyan-400" />
                  <span>Numerical Telemetry Only</span>
                </div>
                <p className="text-slate-400 leading-relaxed">
                  Only computed numbers (timestamps, EAR ratios, PERCLOS percentages, and pitch/yaw angles) are synced to your private history.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#080910] border border-[#1b1f2e] space-y-1">
                <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-indigo-400" />
                  <span>User Row-Level Security</span>
                </div>
                <p className="text-slate-400 leading-relaxed">
                  All cloud database queries enforce strict PostgreSQL Row Level Security locked to your Clerk user identity token.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#080910] border border-[#1b1f2e] space-y-1">
                <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <FileSpreadsheet className="w-4 h-4 text-purple-400" />
                  <span>1-Click GDPR Purge</span>
                </div>
                <p className="text-slate-400 leading-relaxed">
                  Export complete session logs to CSV / JSON anytime, or permanently wipe all historical calibrations and telemetry with Delete My Data.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA Banner */}
        <section className="py-20 px-4 sm:px-6 text-center space-y-6">
          <div className="max-w-2xl mx-auto space-y-3">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white dark:text-white light:text-slate-900 tracking-tight">
              Ready to monitor driver alertness?
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Open the cockpit directly in your browser. No downloads, native apps, or cloud video setup required.
            </p>
          </div>
          <div>
            <Link
              href="/monitor"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-sm tracking-wide transition shadow-xl shadow-emerald-500/20"
            >
              <Play className="w-4 h-4 fill-black" />
              <span>Launch Cockpit Now</span>
            </Link>
          </div>
        </section>
      </main>

      {/* 6. Mandatory Advisory Disclaimer Footer (Section 10 Compliance) */}
      <FooterDisclaimer />
    </div>
  );
}
