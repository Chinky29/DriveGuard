/**
 * DriveGuard Client Telemetry Uploader
 *
 * Implements non-blocking, batched uploading of numerical telemetry points and
 * physiological events every 5 seconds.
 *
 * Rules:
 * - Never blocks the real-time FaceMesh / requestAnimationFrame detection loop.
 * - Handles offline state: queues in-memory and retries when network connectivity resumes.
 * - Privacy by Design (Rule 3): Only numbers and timestamps are buffered, never video frames.
 */

import { SingleMetricPointInput, SingleEventInput } from "@/lib/api/schemas";

export interface UploaderOptions {
  flushIntervalMs?: number;
  maxBufferSize?: number;
  onFlushError?: (error: Error) => void;
}

export class ClientTelemetryUploader {
  private sessionId: string | null = null;
  private metricsBuffer: SingleMetricPointInput[] = [];
  private eventsBuffer: SingleEventInput[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;
  private isUploading = false;
  private readonly flushIntervalMs: number;
  private readonly maxBufferSize: number;
  private readonly onFlushError?: (error: Error) => void;
  private onlineHandler: (() => void) | null = null;

  constructor(options: UploaderOptions = {}) {
    this.flushIntervalMs = options.flushIntervalMs ?? 5000;
    this.maxBufferSize = options.maxBufferSize ?? 1000;
    this.onFlushError = options.onFlushError;

    // Attach online recovery listener in browser environment
    if (typeof window !== "undefined") {
      this.onlineHandler = () => {
        this.flush().catch((err) => {
          console.warn("[DriveGuard Uploader] Offline flush retry failed:", err);
        });
      };
      window.addEventListener("online", this.onlineHandler);
    }
  }

  /**
   * Sets the active cloud session ID for subsequent batches.
   */
  public setSessionId(id: string | null): void {
    this.sessionId = id;
    if (id && !this.timer) {
      this.startTimer();
    }
  }

  public getSessionId(): string | null {
    return this.sessionId;
  }

  /**
   * Adds a numerical metric point to the buffer.
   * Completely synchronous and non-blocking O(1) memory push.
   */
  public queueMetricPoint(point: SingleMetricPointInput): void {
    if (this.metricsBuffer.length >= this.maxBufferSize) {
      // Discard oldest sample if buffer reaches capacity during prolonged disconnection
      this.metricsBuffer.shift();
    }
    this.metricsBuffer.push(point);
  }

  /**
   * Adds a physiological event to the buffer.
   * Completely synchronous and non-blocking O(1) memory push.
   */
  public queueEvent(event: SingleEventInput): void {
    if (this.eventsBuffer.length >= this.maxBufferSize) {
      this.eventsBuffer.shift();
    }
    this.eventsBuffer.push(event);
  }

  /**
   * Starts periodic timer dispatching flushes every 5 seconds.
   */
  public startTimer(): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      // Non-blocking fire-and-forget call
      void this.flush();
    }, this.flushIntervalMs);
  }

  /**
   * Flushes currently queued metrics and events to the backend.
   * Gracefully falls back and retains buffer if offline or during network error.
   */
  public async flush(): Promise<void> {
    if (!this.sessionId || this.isUploading) {
      return;
    }

    if (this.metricsBuffer.length === 0 && this.eventsBuffer.length === 0) {
      return;
    }

    // Check offline state
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      return;
    }

    this.isUploading = true;

    // Snapshot buffers
    const metricsToUpload = [...this.metricsBuffer];
    const eventsToUpload = [...this.eventsBuffer];
    this.metricsBuffer = [];
    this.eventsBuffer = [];

    try {
      const uploadPromises: Promise<Response>[] = [];

      // 1. Upload metric points batch
      if (metricsToUpload.length > 0) {
        uploadPromises.push(
          fetch("/api/telemetry", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sessionId: this.sessionId,
              points: metricsToUpload,
            }),
          })
        );
      }

      // 2. Upload events batch
      if (eventsToUpload.length > 0) {
        uploadPromises.push(
          fetch("/api/events", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sessionId: this.sessionId,
              events: eventsToUpload,
            }),
          })
        );
      }

      const responses = await Promise.all(uploadPromises);
      for (const res of responses) {
        if (!res.ok) {
          throw new Error(`Uploader HTTP ${res.status}: ${res.statusText}`);
        }
      }
    } catch (err: unknown) {
      // Restore failed points to front of buffer for retry on next interval or online event
      this.metricsBuffer = [...metricsToUpload, ...this.metricsBuffer].slice(
        -this.maxBufferSize
      );
      this.eventsBuffer = [...eventsToUpload, ...this.eventsBuffer].slice(
        -this.maxBufferSize
      );

      const error = err instanceof Error ? err : new Error(String(err));
      if (this.onFlushError) {
        this.onFlushError(error);
      }
    } finally {
      this.isUploading = false;
    }
  }

  /**
   * Stops the periodic uploader and cleans up listeners.
   */
  public destroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (typeof window !== "undefined" && this.onlineHandler) {
      window.removeEventListener("online", this.onlineHandler);
      this.onlineHandler = null;
    }
    // Attempt final sync
    void this.flush();
  }
}
