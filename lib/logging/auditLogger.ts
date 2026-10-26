import { AuditEvent, AdvisoryLevel } from "@/lib/types";

/**
 * Client Session Audit Logger
 *
 * Implements Rule 3 (Privacy by Design): Logs numerical telemetry and advisory transitions.
 * Never stores or exports raw camera frames.
 */
export class ClientAuditLogger {
  private events: AuditEvent[] = [];

  public logEvent(event: Omit<AuditEvent, "id">): void {
    const fullEvent: AuditEvent = {
      ...event,
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    };
    this.events.push(fullEvent);
  }

  public getEvents(): readonly AuditEvent[] {
    return this.events;
  }

  public clear(): void {
    this.events = [];
  }

  /**
   * Generates CSV format string from recorded events
   */
  public exportCsv(): string {
    const headers = [
      "id",
      "timestamp",
      "level",
      "reason",
      "duration_seconds",
      "peak_ear",
      "final_perclos",
      "peak_yaw",
      "peak_pitch",
    ];

    const rows = this.events.map((e) => [
      e.id,
      e.timestamp,
      e.level,
      `"${e.reason.replace(/"/g, '""')}"`,
      e.durationSeconds.toFixed(2),
      e.peakEar.toFixed(3),
      e.finalPerclos !== null ? e.finalPerclos.toFixed(3) : "N/A",
      e.peakYaw.toFixed(1),
      e.peakPitch.toFixed(1),
    ]);

    return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  }
}

export const auditLogger = new ClientAuditLogger();
