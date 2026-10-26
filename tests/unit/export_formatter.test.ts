import { describe, it, expect } from "vitest";
import {
  escapeCsvField,
  formatSessionAsCsv,
  formatSessionAsJson,
  SessionExportBundle,
} from "@/lib/api/export";

describe("Session Export Formatter", () => {
  const sampleBundle: SessionExportBundle = {
    session: {
      id: "sess-123e4567-e89b-12d3",
      userId: "user_2test12345",
      startTime: "2026-10-26T22:00:00.000Z",
      endTime: "2026-10-26T22:15:00.000Z",
      durationSeconds: 900,
      avgFatigueScore: 24.5,
      peakFatigueScore: 62,
      noticeCount: 2,
      warningCount: 1,
      criticalCount: 0,
      createdAt: "2026-10-26T22:00:00.000Z",
    },
    events: [
      {
        id: "evt-1",
        sessionId: "sess-123e4567-e89b-12d3",
        timestampSec: 120.5,
        level: "Notice",
        score: 32,
        reason: "prolonged eye closure, high blink rate",
      },
      {
        id: "evt-2",
        sessionId: "sess-123e4567-e89b-12d3",
        timestampSec: 450.0,
        level: "Warning",
        score: 62,
        reason: 'sustained head deviation "looking down"',
      },
    ],
    metrics: [
      {
        id: "pt-1",
        sessionId: "sess-123e4567-e89b-12d3",
        timestampSec: 1.0,
        fatigueScore: 12,
        ear: 0.3152,
        mar: 0.1104,
        pitch: -3.2,
        yaw: 1.5,
        roll: 0.2,
        perclos: 0.0315,
      },
      {
        id: "pt-2",
        sessionId: "sess-123e4567-e89b-12d3",
        timestampSec: 2.0,
        fatigueScore: 14,
        ear: 0.298,
        mar: 0.125,
        pitch: -4.1,
        yaw: 2.0,
        roll: 0.3,
        perclos: 0.045,
      },
    ],
  };

  describe("escapeCsvField", () => {
    it("handles plain strings without quotes", () => {
      expect(escapeCsvField("nominal_state")).toBe("nominal_state");
      expect(escapeCsvField(42)).toBe("42");
    });

    it("escapes fields containing commas", () => {
      expect(escapeCsvField("closure, deviation")).toBe('"closure, deviation"');
    });

    it("escapes fields containing internal double quotes", () => {
      expect(escapeCsvField('head "nodding" detected')).toBe('"head ""nodding"" detected"');
    });

    it("handles null or undefined cleanly", () => {
      expect(escapeCsvField(null)).toBe("");
      expect(escapeCsvField(undefined)).toBe("");
    });
  });

  describe("formatSessionAsCsv", () => {
    it("generates valid CSV structure with metadata, events, and metrics", () => {
      const csv = formatSessionAsCsv(sampleBundle);

      expect(csv).toContain("# DriveGuard Session Telemetry Export (Rule 3: Local Processing Only - No Video Frames)");
      expect(csv).toContain("# Session ID: sess-123e4567-e89b-12d3");
      expect(csv).toContain("# User ID: user_2test12345");
      expect(csv).toContain("# Duration: 900s");

      // Verify Events Log table
      expect(csv).toContain("--- EVENTS LOG ---");
      expect(csv).toContain("timestamp_sec,level,score,reason");
      expect(csv).toContain('120.50,Notice,32,"prolonged eye closure, high blink rate"');
      expect(csv).toContain('450.00,Warning,62,"sustained head deviation ""looking down"""');

      // Verify Metric Points table
      expect(csv).toContain("--- METRIC POINTS ---");
      expect(csv).toContain("timestamp_sec,fatigue_score,ear,mar,pitch,yaw,roll,perclos");
      expect(csv).toContain("1.00,12,0.3152,0.1104,-3.20,1.50,0.20,0.0315");
    });
  });

  describe("formatSessionAsJson", () => {
    it("generates compliant JSON export with metadata and structured summaries", () => {
      const json = formatSessionAsJson(sampleBundle) as any;

      expect(json.meta.compliance).toContain("Rule 3: Privacy by Design");
      expect(json.session.id).toBe("sess-123e4567-e89b-12d3");
      expect(json.summary.totalEvents).toBe(2);
      expect(json.summary.totalMetricPoints).toBe(2);
      expect(json.summary.warningCount).toBe(1);
      expect(json.events.length).toBe(2);
      expect(json.metrics.length).toBe(2);
    });
  });
});
