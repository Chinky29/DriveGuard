"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Sliders,
  Volume2,
  VolumeX,
  Vibrate,
  Globe,
  Sun,
  Moon,
  RotateCcw,
  Trash2,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Info,
} from "lucide-react";

export interface UserSettings {
  sensitivity: "low" | "balanced" | "high";
  soundEnabled: boolean;
  volume: number; // 0 - 100
  vibrationEnabled: boolean;
  language: string;
  theme: "dark" | "light";
}

const DEFAULT_SETTINGS: UserSettings = {
  sensitivity: "balanced",
  soundEnabled: true,
  volume: 80,
  vibrationEnabled: true,
  language: "en-US",
  theme: "dark",
};

const SETTINGS_STORAGE_KEY = "driveguard_user_settings";

export default function SettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [isVibrationSupported, setIsVibrationSupported] = useState<boolean>(true);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState<string>("");

  useEffect(() => {
    // Check vibration support
    if (typeof navigator !== "undefined") {
      setIsVibrationSupported("vibrate" in navigator);
    }

    // Load stored settings
    try {
      const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (stored) {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(stored) });
      }
    } catch (e) {
      console.warn("Failed to load settings:", e);
    }
  }, []);

  const updateSetting = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
      setSaveNotice("Settings saved");
      setTimeout(() => setSaveNotice(null), 2000);
    } catch (e) {
      console.warn("Failed to save settings:", e);
    }
  };

  const handleDeleteAllData = async () => {
    if (deleteConfirmationText.trim().toLowerCase() !== "delete") {
      alert("Please type 'delete' to confirm data deletion.");
      return;
    }

    setIsDeleting(true);
    try {
      const res = await fetch("/api/user/data", { method: "DELETE" });
      if (!res.ok) {
        throw new Error("Failed to delete user records");
      }
      localStorage.clear();
      setIsDeleteModalOpen(false);
      alert("All cloud calibration, telemetry, and monitoring history has been permanently deleted.");
      router.push("/monitor");
    } catch (err: unknown) {
      alert(`Deletion error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090a10] text-slate-100 flex flex-col font-sans">
      {/* Top Header */}
      <header className="w-full bg-[#10121a] border-b border-[#222533] px-4 py-3 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <Link
            href="/monitor"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            aria-label="Back to monitor cockpit"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <h1 className="text-base font-extrabold text-white tracking-tight flex items-center gap-2">
            DriveGuard <span className="text-slate-500 font-mono text-xs">/ Settings</span>
          </h1>
        </div>

        {saveNotice && (
          <span className="text-xs text-emerald-400 font-mono flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {saveNotice}
          </span>
        )}
      </header>

      {/* Main Settings Container */}
      <main className="flex-1 max-w-3xl w-full mx-auto p-4 sm:p-6 space-y-6">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">System & Monitoring Preferences</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure detection thresholds, advisory alarms, and privacy controls
          </p>
        </div>

        {/* 1. Detection Sensitivity */}
        <section className="p-5 rounded-2xl bg-[#11131c] border border-[#1e2230] space-y-4">
          <div className="flex items-center gap-2.5">
            <Sliders className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">Detection Sensitivity</h3>
          </div>
          <p className="text-xs text-slate-400">
            Controls how quickly prolonged eye closure or sustained head turns trigger Notice or Warning levels.
          </p>

          <div className="grid grid-cols-3 gap-2.5">
            {[
              {
                id: "low",
                label: "Low",
                desc: "Higher thresholds. Best for daytime motorway driving.",
              },
              {
                id: "balanced",
                label: "Balanced",
                desc: "Nominal calibrated thresholds. Recommended default.",
              },
              {
                id: "high",
                label: "High",
                desc: "Strict timing. Faster alert triggers for high-risk drives.",
              },
            ].map((option) => (
              <button
                key={option.id}
                onClick={() => updateSetting("sensitivity", option.id as UserSettings["sensitivity"])}
                className={`p-3.5 rounded-xl border text-left transition flex flex-col justify-between ${
                  settings.sensitivity === option.id
                    ? "bg-emerald-500/10 border-emerald-500/40 text-white"
                    : "bg-[#151722] border-[#222636] text-slate-400 hover:border-slate-600"
                }`}
              >
                <span className="text-xs font-bold capitalize text-white">{option.label}</span>
                <span className="text-[11px] text-slate-400 mt-1 leading-tight">{option.desc}</span>
              </button>
            ))}
          </div>
        </section>

        {/* 2. Audio & Haptics */}
        <section className="p-5 rounded-2xl bg-[#11131c] border border-[#1e2230] space-y-5">
          <div className="flex items-center gap-2.5">
            <Volume2 className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">Advisory Sounds & Haptics</h3>
          </div>

          {/* Sound Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-white">Audio Chimes</p>
              <p className="text-[11px] text-slate-400">
                Play subtle Web Audio chimes on Notice, Warning, and Critical alerts
              </p>
            </div>
            <button
              onClick={() => updateSetting("soundEnabled", !settings.soundEnabled)}
              className={`w-11 h-6 rounded-full transition-colors relative ${
                settings.soundEnabled ? "bg-emerald-500" : "bg-slate-700"
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${
                  settings.soundEnabled ? "left-5" : "left-0.5"
                }`}
              />
            </button>
          </div>

          {/* Volume Slider */}
          {settings.soundEnabled && (
            <div className="space-y-2 pt-2 border-t border-[#1c1f2b]">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300">Volume</span>
                <span className="font-mono text-emerald-400">{settings.volume}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={settings.volume}
                onChange={(e) => updateSetting("volume", Number(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>
          )}

          {/* Vibration Toggle */}
          <div className="flex items-center justify-between pt-2 border-t border-[#1c1f2b]">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-xs font-semibold text-white">Vibration Haptics</p>
                {!isVibrationSupported && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                    Not supported on this browser/OS
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                Trigger device vibration pulses during Warning and Critical events
              </p>
            </div>
            <button
              disabled={!isVibrationSupported}
              onClick={() => updateSetting("vibrationEnabled", !settings.vibrationEnabled)}
              className={`w-11 h-6 rounded-full transition-colors relative ${
                settings.vibrationEnabled && isVibrationSupported ? "bg-emerald-500" : "bg-slate-700"
              } ${!isVibrationSupported ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <span
                className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${
                  settings.vibrationEnabled && isVibrationSupported ? "left-5" : "left-0.5"
                }`}
              />
            </button>
          </div>
        </section>

        {/* 3. Language & Visual Theme */}
        <section className="p-5 rounded-2xl bg-[#11131c] border border-[#1e2230] space-y-4">
          <div className="flex items-center gap-2.5">
            <Globe className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">Localization & Theme</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Language Select */}
            <div>
              <label htmlFor="voice-language" className="block text-xs font-semibold text-white mb-1.5">Voice Advisory Language</label>
              <select
                id="voice-language"
                value={settings.language}
                onChange={(e) => updateSetting("language", e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#171926] border border-[#262a3d] text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="en-US">English (United States)</option>
                <option value="en-GB">English (United Kingdom)</option>
                <option value="es-ES">Español</option>
                <option value="fr-FR">Français</option>
                <option value="de-DE">Deutsch</option>
                <option value="ja-JP">日本語 (Japanese)</option>
              </select>
            </div>

            {/* Theme Toggle */}
            <div>
              <span id="theme-label" className="block text-xs font-semibold text-white mb-1.5">Display Theme</span>
              <div role="radiogroup" aria-labelledby="theme-label" className="grid grid-cols-2 gap-2">
                <button
                  role="radio"
                  aria-checked={settings.theme === "dark"}
                  onClick={() => updateSetting("theme", "dark")}
                  className={`px-3 py-2 rounded-xl border text-xs font-medium flex items-center justify-center gap-2 transition ${
                    settings.theme === "dark"
                      ? "bg-slate-800 border-emerald-500/50 text-white"
                      : "bg-[#171926] border-[#262a3d] text-slate-400"
                  }`}
                >
                  <Moon className="w-3.5 h-3.5" />
                  <span>Dark</span>
                </button>
                <button
                  role="radio"
                  aria-checked={settings.theme === "light"}
                  onClick={() => updateSetting("theme", "light")}
                  className={`px-3 py-2 rounded-xl border text-xs font-medium flex items-center justify-center gap-2 transition ${
                    settings.theme === "light"
                      ? "bg-slate-800 border-emerald-500/50 text-white"
                      : "bg-[#171926] border-[#262a3d] text-slate-400"
                  }`}
                >
                  <Sun className="w-3.5 h-3.5" />
                  <span>Light</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* 4. Facial Baseline Calibration */}
        <section className="p-5 rounded-2xl bg-[#11131c] border border-[#1e2230] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-emerald-400" />
              Facial Baseline Recalibration
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md">
              Recalibrate your resting Eye Aspect Ratio (EAR) and mouth baseline if your camera angle, glasses, or lighting conditions have changed.
            </p>
          </div>
          <Link
            href="/monitor?recalibrate=true"
            className="px-4 py-2.5 rounded-xl bg-[#171926] hover:bg-[#1e2233] border border-[#2b3046] text-xs font-semibold text-emerald-400 flex items-center justify-center gap-2 transition self-start sm:self-auto"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Recalibrate Now</span>
          </Link>
        </section>

        {/* 5. Danger Zone: Delete My Data */}
        <section className="p-5 rounded-2xl bg-red-950/20 border border-red-900/40 space-y-3">
          <div className="flex items-center gap-2 text-red-400">
            <Trash2 className="w-4 h-4" />
            <h3 className="text-sm font-bold">Delete All My Data</h3>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            GDPR & Privacy Guarantee: Permanently wipes all facial calibrations, monitoring sessions, event logs, and numerical telemetry from Supabase and local storage. This action cannot be undone.
          </p>
          <button
            onClick={() => setIsDeleteModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-xs transition"
          >
            Delete All My Data
          </button>
        </section>
      </main>

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        >
          <div className="w-full max-w-md bg-[#141622] border border-red-900/60 rounded-2xl p-6 text-slate-100 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-red-500/10 text-red-400 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Permanently Delete All Data?</h3>
                <p className="text-xs text-slate-400 mt-1">
                  This will completely remove all your sessions, historical telemetry, and facial calibrations from DriveGuard servers.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="delete-confirmation-input" className="text-xs text-slate-300">
                To confirm, type <span className="font-mono font-bold text-red-400">delete</span> below:
              </label>
              <input
                id="delete-confirmation-input"
                type="text"
                value={deleteConfirmationText}
                onChange={(e) => setDeleteConfirmationText(e.target.value)}
                placeholder="delete"
                className="w-full px-3 py-2 rounded-xl bg-[#0e1017] border border-[#292c3d] text-xs text-white focus:outline-none focus:border-red-500"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition"
              >
                Cancel
              </button>
              <button
                disabled={isDeleting || deleteConfirmationText.trim().toLowerCase() !== "delete"}
                onClick={handleDeleteAllData}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-semibold text-white transition disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Permanently Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
