/**
 * DriveGuard Session Export Formatter
 *
 * Implements pure export formatting for session metrics and event logs
 * to CSV and JSON formats, with field escaping and timestamp serialization.
 */

export interface ExportSessionData {
  id: string;
  userId: string;
  startTime: string;
  endTime?: string | null;
  durationSeconds: number;
  avgFatigueScore: number;
  peakFatigueScore: number;
  noticeCount: number;
  warningCount: number;
  criticalCount: number;
  createdAt: string;
}

export interface ExportEventData {
  id?: string;
  sessionId: string;
  timestampSec: number;
  level: "Notice" | "Warning" | "Critical";
  score: number;
  reason: string;
  createdAt?: string;
}

export interface ExportMetricPointData {
  id?: string;
  sessionId: string;
  timestampSec: number;
  fatigueScore: number;
  ear: number;
  mar: number;
  pitch: number;
  yaw: number;
  roll: number;
  perclos: number;
  createdAt?: string;
}

export interface SessionExportBundle {
  session: ExportSessionData;
  events: ExportEventData[];
  metrics: ExportMetricPointData[];
}

/**
 * Escapes a string field for standard RFC 4180 CSV output.
 */
export function escapeCsvField(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Formats a full session export into structured RFC 4180 CSV text.
 */
export function formatSessionAsCsv(bundle: SessionExportBundle): string {
  const lines: string[] = [];

  // Header Metadata Section
  lines.push("# DriveGuard Session Telemetry Export (Rule 3: Local Processing Only - No Video Frames)");
  lines.push(`# Session ID: ${bundle.session.id}`);
  lines.push(`# User ID: ${bundle.session.userId}`);
  lines.push(`# Start Time: ${bundle.session.startTime}`);
  lines.push(`# End Time: ${bundle.session.endTime || "In Progress"}`);
  lines.push(`# Duration: ${bundle.session.durationSeconds}s`);
  lines.push(`# Avg Score: ${bundle.session.avgFatigueScore} | Peak Score: ${bundle.session.peakFatigueScore}`);
  lines.push(`# Alerts: ${bundle.session.noticeCount} Notices, ${bundle.session.warningCount} Warnings, ${bundle.session.criticalCount} Criticals`);
  lines.push("");

  // Table 1: Physiological Events Log
  lines.push("--- EVENTS LOG ---");
  lines.push("timestamp_sec,level,score,reason");
  for (const event of bundle.events) {
    lines.push(
      [
        event.timestampSec.toFixed(2),
        escapeCsvField(event.level),
        event.score,
        escapeCsvField(event.reason),
      ].join(",")
    );
  }

  lines.push("");

  // Table 2: Time-series Telemetry Points
  lines.push("--- METRIC POINTS ---");
  lines.push("timestamp_sec,fatigue_score,ear,mar,pitch,yaw,roll,perclos");
  for (const m of bundle.metrics) {
    lines.push(
      [
        m.timestampSec.toFixed(2),
        m.fatigueScore,
        m.ear.toFixed(4),
        m.mar.toFixed(4),
        m.pitch.toFixed(2),
        m.yaw.toFixed(2),
        m.roll.toFixed(2),
        m.perclos.toFixed(4),
      ].join(",")
    );
  }

  return lines.join("\n");
}

/**
 * Formats a session export bundle into an authorized JSON payload.
 */
export function formatSessionAsJson(bundle: SessionExportBundle): object {
  return {
    meta: {
      generator: "DriveGuard Cockpit Telemetry Exporter v0.1.0",
      compliance: "Rule 3: Privacy by Design. Numerical telemetry only, zero video frames recorded.",
      exportedAt: new Date().toISOString(),
    },
    session: bundle.session,
    summary: {
      totalEvents: bundle.events.length,
      totalMetricPoints: bundle.metrics.length,
      noticeCount: bundle.session.noticeCount,
      warningCount: bundle.session.warningCount,
      criticalCount: bundle.session.criticalCount,
    },
    events: bundle.events,
    metrics: bundle.metrics,
  };
}
