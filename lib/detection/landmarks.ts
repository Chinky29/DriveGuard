import { FaceLandmarker, FilesetResolver, FaceLandmarkerResult } from "@mediapipe/tasks-vision";

export interface LandmarkDetectorOptions {
  readonly targetFps?: number; // Target FPS for detection throttle (default: 18 FPS)
  readonly onResults?: (result: FaceLandmarkerResult, fps: number) => void;
  readonly onError?: (error: Error) => void;
}

export class FaceLandmarkManager {
  private landmarker: FaceLandmarker | null = null;
  private isInitializing: boolean = false;
  private isRunning: boolean = false;
  private animFrameId: number | null = null;
  private lastDetectionTime: number = 0;
  private lastVideoTime: number = -1;
  private fpsHistory: number[] = [];
  private lastFpsCalcTime: number = 0;
  private currentFps: number = 0;
  private options: LandmarkDetectorOptions = {};
  private videoElement: HTMLVideoElement | null = null;
  private isTabVisible: boolean = true;

  constructor(options: LandmarkDetectorOptions = {}) {
    this.options = { targetFps: 18, ...options };
    if (typeof window !== "undefined") {
      this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
      document.addEventListener("visibilitychange", this.handleVisibilityChange);
    }
  }

  private handleVisibilityChange() {
    this.isTabVisible = !document.hidden;
    if (this.isTabVisible && this.isRunning && this.videoElement) {
      this.lastDetectionTime = performance.now();
      this.scheduleLoop();
    }
  }

  /**
   * Initializes the FaceLandmarker instance with GPU delegate and CPU fallback.
   * Enables facial transformation matrices as required by Phase 1.
   */
  public async init(): Promise<FaceLandmarker> {
    if (this.landmarker) return this.landmarker;
    if (this.isInitializing) {
      throw new Error("Landmark detector initialization already in progress");
    }

    this.isInitializing = true;

    try {
      // Resolve WebAssembly binaries: try local /wasm first, fallback to CDN
      let vision;
      try {
        vision = await FilesetResolver.forVisionTasks("/wasm");
      } catch {
        vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );
      }

      // Model path: try local /models/face_landmarker.task first, fallback to Google CDN
      const modelAssetPath = "/models/face_landmarker.task";

      // Attempt initialization with GPU delegate
      try {
        this.landmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath,
            delegate: "GPU",
          },
          outputFacialTransformationMatrixes: true,
          outputFaceBlendshapes: false,
          runningMode: "VIDEO",
          numFaces: 1,
        });
      } catch (gpuError) {
        console.warn("GPU delegate failed, falling back to CPU delegate:", gpuError);
        // Fallback to CPU delegate
        this.landmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath,
            delegate: "CPU",
          },
          outputFacialTransformationMatrixes: true,
          outputFaceBlendshapes: false,
          runningMode: "VIDEO",
          numFaces: 1,
        });
      }

      this.isInitializing = false;
      return this.landmarker;
    } catch (err) {
      this.isInitializing = false;
      const error = err instanceof Error ? err : new Error(String(err));
      if (this.options.onError) {
        this.options.onError(error);
      }
      throw error;
    }
  }

  /**
   * Starts the detection loop bound to an HTMLVideoElement.
   * Throttled via requestAnimationFrame to ~15-20 FPS.
   */
  public start(video: HTMLVideoElement): void {
    if (this.isRunning) return;
    this.videoElement = video;
    this.isRunning = true;
    this.lastDetectionTime = performance.now();
    this.lastVideoTime = -1;
    this.scheduleLoop();
  }

  /**
   * Stops the detection loop and cancels any pending animation frame.
   */
  public stop(): void {
    this.isRunning = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    this.videoElement = null;
  }

  /**
   * Fully releases resources.
   */
  public destroy(): void {
    this.stop();
    if (typeof window !== "undefined") {
      document.removeEventListener("visibilitychange", this.handleVisibilityChange);
    }
    if (this.landmarker) {
      this.landmarker.close();
      this.landmarker = null;
    }
  }

  private scheduleLoop(): void {
    if (!this.isRunning) return;
    this.animFrameId = requestAnimationFrame((timestamp) => this.loop(timestamp));
  }

  private loop(timestamp: number): void {
    if (!this.isRunning || !this.videoElement || !this.isTabVisible) {
      return;
    }

    const targetIntervalMs = 1000 / (this.options.targetFps || 18);
    const elapsed = timestamp - this.lastDetectionTime;

    if (elapsed >= targetIntervalMs) {
      const video = this.videoElement;

      // Ensure video has received frames and has valid dimensions
      if (
        this.landmarker &&
        video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
        video.currentTime !== this.lastVideoTime &&
        video.videoWidth > 0 &&
        video.videoHeight > 0
      ) {
        this.lastVideoTime = video.currentTime;
        const startTime = performance.now();

        try {
          const results = this.landmarker.detectForVideo(video, startTime);

          // Calculate real detection FPS
          this.recordFps(startTime);

          if (this.options.onResults) {
            this.options.onResults(results, this.currentFps);
          }
        } catch (detectionErr) {
          console.error("MediaPipe detection error:", detectionErr);
        }

        this.lastDetectionTime = timestamp;
      }
    }

    this.scheduleLoop();
  }

  private recordFps(now: number): void {
    this.fpsHistory.push(now);

    // Keep history from the last 1000ms
    const cutoff = now - 1000;
    while (this.fpsHistory.length > 0 && this.fpsHistory[0] < cutoff) {
      this.fpsHistory.shift();
    }

    if (now - this.lastFpsCalcTime >= 200) {
      this.currentFps = this.fpsHistory.length;
      this.lastFpsCalcTime = now;
    }
  }
}
