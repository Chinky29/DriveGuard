/**
 * MediaPipe FaceLandmarker WebAssembly Integration
 *
 * TODO: Loads @mediapipe/tasks-vision WebAssembly bundle for in-browser client detection.
 */

export interface MediaPipeLandmarkerOptions {
  readonly runningMode?: "IMAGE" | "VIDEO";
  readonly numFaces?: number;
  readonly minFaceDetectionConfidence?: number;
}

export class BrowserFaceLandmarker {
  private isReady: boolean = false;

  public async initialize(_options?: MediaPipeLandmarkerOptions): Promise<void> {
    // MediaPipe WebAssembly loader initialized in Phase 1
    this.isReady = true;
  }

  public get ready(): boolean {
    return this.isReady;
  }

  public detectForVideo(_video: HTMLVideoElement, _timestampMs: number) {
    if (!this.isReady) {
      throw new Error("FaceLandmarker not initialized");
    }
    return {
      faceLandmarks: [],
    };
  }
}
