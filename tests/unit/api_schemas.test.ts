import { describe, it, expect } from "vitest";
import {
  createSessionSchema,
  updateSessionSchema,
  singleEventSchema,
  createEventsBatchSchema,
  singleMetricPointSchema,
  createMetricPointsBatchSchema,
  exportQuerySchema,
} from "@/lib/api/schemas";

describe("API Validation Schemas (Zod)", () => {
  describe("createSessionSchema", () => {
    it("accepts an empty payload and defaults", () => {
      const result = createSessionSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it("accepts a valid ISO start time", () => {
      const result = createSessionSchema.safeParse({
        startTime: "2026-10-26T22:00:00.000Z",
      });
      expect(result.success).toBe(true);
    });

    it("rejects non-datetime strings", () => {
      const result = createSessionSchema.safeParse({
        startTime: "invalid-date",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("updateSessionSchema", () => {
    it("accepts valid summary telemetry metrics", () => {
      const result = updateSessionSchema.safeParse({
        endTime: "2026-10-26T22:30:00.000Z",
        durationSeconds: 1800,
        avgFatigueScore: 42.5,
        peakFatigueScore: 78,
        noticeCount: 3,
        warningCount: 1,
        criticalCount: 0,
      });
      expect(result.success).toBe(true);
    });

    it("rejects negative durations or count fields", () => {
      const result = updateSessionSchema.safeParse({
        durationSeconds: -10,
        noticeCount: -1,
      });
      expect(result.success).toBe(false);
    });

    it("rejects fatigue scores above 100", () => {
      const result = updateSessionSchema.safeParse({
        peakFatigueScore: 125,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("singleEventSchema & createEventsBatchSchema", () => {
    const validUuid = "123e4567-e89b-12d3-a456-426614174000";

    it("validates a compliant physiological event", () => {
      const result = singleEventSchema.safeParse({
        timestampSec: 14.5,
        level: "Notice",
        score: 35,
        reason: "prolonged eye closure",
      });
      expect(result.success).toBe(true);
    });

    it("rejects non-standard advisory levels", () => {
      const result = singleEventSchema.safeParse({
        timestampSec: 10,
        level: "DROWSY", // Violates Rule 1
        score: 50,
        reason: "unknown",
      });
      expect(result.success).toBe(false);
    });

    it("accepts a batch of events with valid session UUID", () => {
      const result = createEventsBatchSchema.safeParse({
        sessionId: validUuid,
        events: [
          {
            timestampSec: 12.0,
            level: "Notice",
            score: 30,
            reason: "high eye closure proportion",
          },
          {
            timestampSec: 25.4,
            level: "Warning",
            score: 65,
            reason: "sustained head deviation",
          },
        ],
      });
      expect(result.success).toBe(true);
    });

    it("rejects an invalid session UUID or empty events array", () => {
      const invalidUuid = createEventsBatchSchema.safeParse({
        sessionId: "not-a-uuid",
        events: [],
      });
      expect(invalidUuid.success).toBe(false);
    });
  });

  describe("singleMetricPointSchema & createMetricPointsBatchSchema", () => {
    const validUuid = "123e4567-e89b-12d3-a456-426614174000";

    it("validates nominal numerical telemetry point", () => {
      const result = singleMetricPointSchema.safeParse({
        timestampSec: 5.0,
        fatigueScore: 18,
        ear: 0.312,
        mar: 0.125,
        pitch: -4.5,
        yaw: 2.1,
        roll: 0.5,
        perclos: 0.045,
      });
      expect(result.success).toBe(true);
    });

    it("rejects out-of-range orientation or perclos", () => {
      const result = singleMetricPointSchema.safeParse({
        timestampSec: 1.0,
        fatigueScore: 20,
        ear: 0.3,
        mar: 0.2,
        pitch: 180, // Exceeds max 90 deg
        yaw: 0,
        roll: 0,
        perclos: 1.5, // Exceeds max 1.0 (100%)
      });
      expect(result.success).toBe(false);
    });

    it("validates batch of metric points", () => {
      const result = createMetricPointsBatchSchema.safeParse({
        sessionId: validUuid,
        points: [
          {
            timestampSec: 1.0,
            fatigueScore: 10,
            ear: 0.3,
            mar: 0.1,
            pitch: 0,
            yaw: 0,
            roll: 0,
            perclos: 0.02,
          },
        ],
      });
      expect(result.success).toBe(true);
    });
  });

  describe("exportQuerySchema", () => {
    it("defaults to csv format when empty", () => {
      const result = exportQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.format).toBe("csv");
      }
    });

    it("accepts json format", () => {
      const result = exportQuerySchema.safeParse({ format: "json" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.format).toBe("json");
      }
    });

    it("rejects unsupported formats like pdf or xml", () => {
      const result = exportQuerySchema.safeParse({ format: "pdf" });
      expect(result.success).toBe(false);
    });
  });
});
