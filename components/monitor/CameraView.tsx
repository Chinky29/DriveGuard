"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { FaceLandmarkManager } from "@/lib/detection/landmarks";
import { computeEAR, computeMAR, computeHeadPose } from "@/lib/detection/features";
import { DriverMetricsTracker } from "@/lib/detection/perclos";
import { DEFAULT_CONFIG } from "@/lib/detection/config";
import { FaceLandmarkerResult, NormalizedLandmark } from "@mediapipe/tasks-vision";

export type CameraState =
  | "idle"
  | "loading"
  | "active"
  | "permission-denied"
  | "no-camera"
  | "model-error";

export interface LiveMetrics {
  readonly ear: number;
  readonly leftEar: number;
  readonly rightEar: number;
  readonly mar: number;
  readonly pitch: number;
  readonly yaw: number;
  readonly roll: number;
  readonly perclos: number;
  readonly blinkCount: number;
  readonly blinkRate: number;
  readonly isEyeClosed: boolean;
  readonly isMicrosleep: boolean;
  readonly microsleepCount: number;
  readonly isYawning: boolean;
  readonly yawnCount: number;
  readonly isNodding: boolean;
  readonly nodCount: number;
  readonly isFaceReliable: boolean;
}

export interface CameraViewProps {
  readonly onLandmarksDetected?: (landmarks: NormalizedLandmark[]) => void;
  readonly onMetricsUpdate?: (metrics: LiveMetrics) => void;
  readonly onBrightnessDetected?: (lux: "optimal" | "low") => void;
  readonly initialDebugOverlay?: boolean;
  readonly showRawTelemetryDebug?: boolean;
  readonly isPaused?: boolean;
}

const INITIAL_METRICS: LiveMetrics = {
  ear: 0.0,
  leftEar: 0.0,
  rightEar: 0.0,
  mar: 0.0,
  pitch: 0.0,
  yaw: 0.0,
  roll: 0.0,
  perclos: 0.0,
  blinkCount: 0,
  blinkRate: 0.0,
  isEyeClosed: false,
  isMicrosleep: false,
  microsleepCount: 0,
  isYawning: false,
  yawnCount: 0,
  isNodding: false,
  nodCount: 0,
  isFaceReliable: false,
};

export function CameraView({
  onLandmarksDetected,
  onMetricsUpdate,
  onBrightnessDetected,
  initialDebugOverlay = false,
  showRawTelemetryDebug = false,
  isPaused = false,
}: CameraViewProps) {
  const [cameraState, setCameraState] = useState<CameraState>("idle");
  const [sourceType, setSourceType] = useState<"webcam" | "demo">("webcam");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [fps, setFps] = useState<number>(0);
  const [showDebugOverlay, setShowDebugOverlay] = useState<boolean>(initialDebugOverlay);
  const [landmarksCount, setLandmarksCount] = useState<number>(0);
  const [liveMetrics, setLiveMetrics] = useState<LiveMetrics>(INITIAL_METRICS);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const managerRef = useRef<FaceLandmarkManager | null>(null);
  const trackerRef = useRef<DriverMetricsTracker>(new DriverMetricsTracker(DEFAULT_CONFIG));
  const isStoppingRef = useRef<boolean>(false);

  // Fully stop and release camera media tracks and detection loop
  const stopCamera = useCallback(() => {
    isStoppingRef.current = true;

    // 1. Stop detection loop
    if (managerRef.current) {
      managerRef.current.stop();
    }

    // 2. Fully release media tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      streamRef.current = null;
    }

    // 3. Detach video stream / video src
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
      videoRef.current.removeAttribute("src");
      videoRef.current.load();
    }

    // 4. Clear canvas overlay
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }

    // 5. Reset tracker
    trackerRef.current.resetContinuousAccumulators();

    setFps(0);
    setLandmarksCount(0);
    setLiveMetrics(INITIAL_METRICS);
    setCameraState("idle");
    setErrorMessage("");
  }, []);

  // Handle incoming landmark results
  const handleResults = useCallback(
    (results: FaceLandmarkerResult, currentFps: number) => {
      setFps(currentFps);

      const canvas = canvasRef.current;
      const video = videoRef.current;
      if (!canvas || !video) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Synchronize canvas resolution with video dimensions
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
        }
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const landmarks =
        results.faceLandmarks && results.faceLandmarks.length > 0
          ? results.faceLandmarks[0]
          : null;

      const isFaceReliable =
        !!landmarks && landmarks.length >= DEFAULT_CONFIG.reliability.minLandmarksRequired;

      setLandmarksCount(landmarks ? landmarks.length : 0);

      if (landmarks && onLandmarksDetected) {
        onLandmarksDetected(landmarks);
      }

      // Draw debug overlay if enabled
      if (showDebugOverlay && landmarks) {
        ctx.fillStyle = "#00FF7F"; // Emerald green
        const radius = 1.4;

        for (let i = 0; i < landmarks.length; i++) {
          const pt = landmarks[i];
          const px = pt.x * canvas.width;
          const py = pt.y * canvas.height;

          ctx.beginPath();
          ctx.arc(px, py, radius, 0, 2 * Math.PI);
          ctx.fill();
        }
      }

      // Compute pure features
      const earRes = computeEAR(landmarks, DEFAULT_CONFIG);
      const marRes = computeMAR(landmarks, DEFAULT_CONFIG);
      const matrixInput =
        results.facialTransformationMatrixes &&
        results.facialTransformationMatrixes.length > 0
          ? results.facialTransformationMatrixes[0]
          : null;
      const poseRes = computeHeadPose(matrixInput);

      // Ingest into pure temporal tracker
      const nowSeconds = performance.now() / 1000.0;
      const snapshot = trackerRef.current.update({
        timestamp: nowSeconds,
        ear: earRes.avgEAR,
        mar: marRes.mar,
        pitch: poseRes.pitch,
        isFaceReliable,
      });

      const metrics: LiveMetrics = {
        ear: earRes.avgEAR,
        leftEar: earRes.leftEAR,
        rightEar: earRes.rightEAR,
        mar: marRes.mar,
        pitch: poseRes.pitch,
        yaw: poseRes.yaw,
        roll: poseRes.roll,
        perclos: snapshot.perclos,
        blinkCount: snapshot.blinkCount,
        blinkRate: snapshot.blinkRatePerMinute,
        isEyeClosed: snapshot.isEyeClosed,
        isMicrosleep: snapshot.isMicrosleep,
        microsleepCount: snapshot.microsleepCount,
        isYawning: snapshot.isYawning,
        yawnCount: snapshot.yawnCount,
        isNodding: snapshot.isNodding,
        nodCount: snapshot.nodCount,
        isFaceReliable,
      };

      setLiveMetrics(metrics);
      if (onMetricsUpdate) {
        onMetricsUpdate(metrics);
      }
    },
    [onLandmarksDetected, onMetricsUpdate, showDebugOverlay]
  );

  // Initialize MediaPipe FaceLandmarker
  const ensureLandmarkerReady = async () => {
    if (!managerRef.current) {
      managerRef.current = new FaceLandmarkManager({
        targetFps: 18,
        onResults: (res, calculatedFps) => {
          if (!isStoppingRef.current) {
            handleResults(res, calculatedFps);
          }
        },
        onError: (err) => {
          console.error("Landmark Manager Error:", err);
          setCameraState("model-error");
          setErrorMessage("Failed to load facial detection model.");
        },
      });
    }
    await managerRef.current.init();
  };

  // Start with demo driver video
  const startDemoVideo = async () => {
    isStoppingRef.current = false;
    setCameraState("loading");
    setErrorMessage("");
    setSourceType("demo");

    try {
      await ensureLandmarkerReady();
      if (isStoppingRef.current) return;

      const video = videoRef.current;
      if (!video) return;

      video.srcObject = null;
      video.src = "/demo_driver.mp4";
      video.loop = true;
      video.muted = true;

      await new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => {
          video
            .play()
            .then(() => resolve())
            .catch((e) => reject(e));
        };
        video.onerror = () => reject(new Error("Failed to load demo video"));
      });

      if (!isStoppingRef.current && managerRef.current) {
        managerRef.current.start(video);
        setCameraState("active");
      }
    } catch (err) {
      console.error("Failed to start demo video:", err);
      setCameraState("no-camera");
      setErrorMessage("Unable to load synthetic test stream.");
    }
  };

  // Start with live webcam stream
  const startWebcam = async () => {
    isStoppingRef.current = false;
    setCameraState("loading");
    setErrorMessage("");
    setSourceType("webcam");

    try {
      try {
        await ensureLandmarkerReady();
      } catch (modelErr) {
        console.error("Model load failure:", modelErr);
        setCameraState("model-error");
        setErrorMessage("Failed to load facial detection model.");
        return;
      }

      if (isStoppingRef.current) return;

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraState("no-camera");
        setErrorMessage("Webcam API is not supported in this browser environment.");
        return;
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 640 },
            height: { ideal: 480 },
          },
          audio: false,
        });
      } catch (mediaErr: unknown) {
        const err = mediaErr as { name?: string };
        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
          setCameraState("permission-denied");
          setErrorMessage(
            "Camera permission denied. Please allow camera access in your browser settings to use DriveGuard."
          );
        } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
          setCameraState("no-camera");
          setErrorMessage(
            "No camera detected. Please connect a webcam or check your system camera settings."
          );
        } else {
          setCameraState("no-camera");
          setErrorMessage(
            "Unable to access camera: " + ((mediaErr as Error)?.message || "Unknown error")
          );
        }
        return;
      }

      if (isStoppingRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      streamRef.current = stream;

      const video = videoRef.current;
      if (video) {
        video.removeAttribute("src");
        video.srcObject = stream;
        video.loop = false;
        video.muted = true;

        await new Promise<void>((resolve) => {
          video.onloadedmetadata = () => {
            video.play().then(() => resolve()).catch(() => resolve());
          };
        });

        if (managerRef.current && !isStoppingRef.current) {
          managerRef.current.start(video);
          setCameraState("active");
        }
      }
    } catch (err) {
      console.error("Camera startup failed:", err);
      setCameraState("no-camera");
      setErrorMessage("Unexpected error during camera initialization.");
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
      if (managerRef.current) {
        managerRef.current.destroy();
        managerRef.current = null;
      }
    };
  }, [stopCamera]);

  return (
    <div className="w-full flex flex-col items-center space-y-4">
      {/* Controls Bar */}
      <div className="w-full flex flex-wrap items-center justify-between gap-3 bg-[#161616] border border-[#323232] rounded-xl px-4 py-3 text-xs font-mono text-slate-300">
        <div className="flex flex-wrap items-center gap-3">
          {cameraState === "active" ? (
            <button
              id="stop-camera-btn"
              onClick={stopCamera}
              className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold transition"
            >
              Stop Camera
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                id="start-camera-btn"
                onClick={startWebcam}
                disabled={cameraState === "loading"}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold transition"
              >
                {cameraState === "loading" && sourceType === "webcam"
                  ? "Initializing..."
                  : "Start Camera"}
              </button>

              <button
                id="start-demo-btn"
                onClick={startDemoVideo}
                disabled={cameraState === "loading"}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 border border-slate-700 font-semibold transition"
                title="Runs synthetic driver test clip for automated verification"
              >
                {cameraState === "loading" && sourceType === "demo"
                  ? "Loading Demo..."
                  : "Start Demo Video"}
              </button>
            </div>
          )}

          {/* Debug Landmark Overlay Toggle */}
          <label className="flex items-center gap-2 cursor-pointer select-none text-slate-300 hover:text-white">
            <input
              id="debug-overlay-toggle"
              type="checkbox"
              checked={showDebugOverlay}
              onChange={(e) => setShowDebugOverlay(e.target.checked)}
              className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
            />
            <span>Landmark Overlay</span>
          </label>
        </div>

        {/* Live FPS & Point Counter */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">FPS:</span>
            <span id="fps-counter" className="font-bold text-emerald-400">
              {fps.toFixed(1)}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">Landmarks:</span>
            <span id="landmarks-counter" className="font-semibold text-slate-200">
              {landmarksCount}
            </span>
          </div>
        </div>
      </div>

      {/* Video Viewport Stage */}
      <div className="relative w-full max-w-3xl aspect-video bg-[#07090f] rounded-2xl overflow-hidden border border-[#323232] shadow-2xl flex items-center justify-center">
        {/* Permanent Privacy Indicator Badge when camera is active (Rule 3) */}
        {cameraState === "active" && (
          <div className="absolute top-4 left-4 z-20 pointer-events-none">
            <div
              id="privacy-badge"
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#161616]/90 border border-[#323232] text-xs font-mono text-[#00FF7F]"
            >
              <span className="w-2 h-2 rounded-full bg-[#00FF7F] animate-pulse" />
              <span className="tracking-wider uppercase font-semibold">
                Camera Active [Local Processing Only]
              </span>
            </div>
          </div>
        )}

        {/* Mirrored Video Preview */}
        <video
          id="camera-video"
          ref={videoRef}
          playsInline
          muted
          autoPlay
          style={{ transform: "scaleX(-1)" }}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            cameraState === "active" ? "opacity-100" : "opacity-0"
          }`}
        />

        {/* Mirrored Canvas Overlay for Landmark Points */}
        <canvas
          id="landmark-canvas"
          ref={canvasRef}
          style={{ transform: "scaleX(-1)" }}
          className="absolute inset-0 pointer-events-none z-10 w-full h-full object-cover"
        />

        {/* Idle / Stopped State */}
        {cameraState === "idle" && (
          <div
            id="idle-overlay"
            className="absolute inset-0 flex flex-col items-center justify-center bg-[#161616]/90 p-6 text-center z-10"
          >
            <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center mb-3 text-slate-400">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            </div>
            <p className="text-sm font-medium text-slate-200">Camera Inactive</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              Click &quot;Start Camera&quot; (or &quot;Start Demo Video&quot;) to initialize video capture and facial landmark detection.
            </p>
          </div>
        )}

        {/* Loading State */}
        {cameraState === "loading" && (
          <div
            id="loading-overlay"
            className="absolute inset-0 flex flex-col items-center justify-center bg-[#161616]/95 p-6 text-center z-10"
          >
            <div className="w-10 h-10 rounded-full border-2 border-emerald-500/30 border-t-emerald-400 animate-spin mb-3" />
            <p className="text-sm font-medium text-slate-200">
              Initializing camera and vision model...
            </p>
            <p className="text-xs text-slate-400 mt-1">Loading MediaPipe Face Landmarker</p>
          </div>
        )}

        {/* Error States (Following design.md copy) */}
        {(cameraState === "permission-denied" ||
          cameraState === "no-camera" ||
          cameraState === "model-error") && (
          <div
            id="error-overlay"
            className="absolute inset-0 flex flex-col items-center justify-center bg-[#161616]/95 p-6 text-center z-10"
          >
            <div className="w-12 h-12 rounded-full bg-red-950/60 border border-red-800/80 flex items-center justify-center mb-3 text-red-400">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <p className="text-sm font-semibold text-red-400 mb-1">
              {cameraState === "permission-denied"
                ? "Permission Denied"
                : cameraState === "no-camera"
                ? "Camera Not Detected"
                : "Model Error"}
            </p>
            <p className="text-xs text-slate-300 max-w-md leading-relaxed">{errorMessage}</p>

            <div className="flex items-center gap-3 mt-4">
              <button
                onClick={startWebcam}
                className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700 transition"
              >
                Retry Camera
              </button>
              <button
                onClick={startDemoVideo}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs text-white font-semibold transition"
              >
                Use Demo Video (Fallback)
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Live Raw Telemetry Debug Panel (Hidden by default, toggled via debug mode) */}
      {showRawTelemetryDebug && (
        <div
          id="raw-metrics-panel"
          className="w-full max-w-3xl bg-[#161616] border border-[#323232] rounded-xl p-4 font-mono text-xs text-slate-300 space-y-3 shadow-lg"
        >
          <div className="flex items-center justify-between border-b border-[#323232] pb-2">
            <span className="font-semibold text-white tracking-wider flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  liveMetrics.isFaceReliable ? "bg-[#00FF7F]" : "bg-slate-600"
                }`}
              />
              LIVE DETECTION TELEMETRY (RAW)
            </span>
            <span
              className={
                liveMetrics.isFaceReliable ? "text-emerald-400 font-semibold" : "text-slate-500"
              }
            >
              {liveMetrics.isFaceReliable ? "FACE RELIABLE" : "FACE NOT RELIABLY DETECTED"}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {/* EAR */}
            <div className="bg-[#07090f] p-3 rounded-lg border border-slate-800">
              <span className="text-slate-500 block text-[11px]">EAR (Mean)</span>
              <span
                id="raw-ear"
                className="text-lg font-bold text-white block mt-0.5"
              >
                {liveMetrics.ear.toFixed(3)}
              </span>
              <span className="text-[10px] text-slate-500 block">
                L: {liveMetrics.leftEar.toFixed(3)} | R: {liveMetrics.rightEar.toFixed(3)}
              </span>
            </div>

            {/* MAR */}
            <div className="bg-[#07090f] p-3 rounded-lg border border-slate-800">
              <span className="text-slate-500 block text-[11px]">MAR (Mouth)</span>
              <span
                id="raw-mar"
                className={`text-lg font-bold block mt-0.5 ${
                  liveMetrics.isYawning ? "text-amber-400" : "text-white"
                }`}
              >
                {liveMetrics.mar.toFixed(3)}
              </span>
              <span className="text-[10px] text-slate-500 block">
                Thr: {DEFAULT_CONFIG.mar.openThreshold.toFixed(2)} | Yawns: {liveMetrics.yawnCount}
              </span>
            </div>

            {/* Head Pitch */}
            <div className="bg-[#07090f] p-3 rounded-lg border border-slate-800">
              <span className="text-slate-500 block text-[11px]">Pitch (Nod)</span>
              <span
                id="raw-pitch"
                className={`text-lg font-bold block mt-0.5 ${
                  liveMetrics.isNodding ? "text-amber-400" : "text-white"
                }`}
              >
                {liveMetrics.pitch >= 0
                  ? `+${liveMetrics.pitch.toFixed(1)}°`
                  : `${liveMetrics.pitch.toFixed(1)}°`}
              </span>
              <span className="text-[10px] text-slate-500 block">
                Yaw: {liveMetrics.yaw.toFixed(1)}° | Nods: {liveMetrics.nodCount}
              </span>
            </div>

            {/* PERCLOS */}
            <div className="bg-[#07090f] p-3 rounded-lg border border-slate-800">
              <span className="text-slate-500 block text-[11px]">PERCLOS (60s)</span>
              <span
                id="raw-perclos"
                className="text-lg font-bold text-emerald-400 block mt-0.5"
              >
                {(liveMetrics.perclos * 100).toFixed(1)}%
              </span>
              <span className="text-[10px] text-slate-500 block">
                Blinks: {liveMetrics.blinkCount} ({liveMetrics.blinkRate.toFixed(1)}/m)
              </span>
            </div>
          </div>

          {/* Secondary event indicators */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/80 text-[11px] text-slate-400">
            <div>
              <span>Microsleeps: </span>
              <span className="text-white font-semibold">{liveMetrics.microsleepCount}</span>
              {liveMetrics.isMicrosleep && (
                <span className="ml-1.5 text-red-400 font-semibold">[CLOSURE &gt; 1.0s]</span>
              )}
            </div>
            <div>
              <span>Blink State: </span>
              <span className="text-white font-semibold">
                {liveMetrics.isEyeClosed ? "Eyes Closed" : "Eyes Open"}
              </span>
            </div>
            <div>
              <span>Roll Angle: </span>
              <span className="text-white font-semibold">{liveMetrics.roll.toFixed(1)}°</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
