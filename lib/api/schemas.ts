/**
 * DriveGuard API Validation Schemas (Zod)
 *
 * Implements strict runtime schema validation for session management,
 * telemetry ingestion, batched events, and export requests.
 */

import { z } from "zod";

export const createSessionSchema = z.object({
  startTime: z.string().datetime().optional(),
});

export const updateSessionSchema = z.object({
  endTime: z.string().datetime().optional(),
  durationSeconds: z.number().int().nonnegative().optional(),
  avgFatigueScore: z.number().min(0).max(100).optional(),
  peakFatigueScore: z.number().int().min(0).max(100).optional(),
  noticeCount: z.number().int().nonnegative().optional(),
  warningCount: z.number().int().nonnegative().optional(),
  criticalCount: z.number().int().nonnegative().optional(),
});

export const singleEventSchema = z.object({
  timestampSec: z.number().nonnegative(),
  level: z.enum(["Notice", "Warning", "Critical"]),
  score: z.number().int().min(0).max(100),
  reason: z.string().min(1).max(255),
});

export const createEventsBatchSchema = z.object({
  sessionId: z.string().uuid("Invalid session UUID"),
  events: z.array(singleEventSchema).min(1, "At least one event is required in a batch"),
});

export const singleMetricPointSchema = z.object({
  timestampSec: z.number().nonnegative(),
  fatigueScore: z.number().int().min(0).max(100),
  ear: z.number().min(0).max(1),
  mar: z.number().min(0).max(2),
  pitch: z.number().min(-90).max(90),
  yaw: z.number().min(-90).max(90),
  roll: z.number().min(-90).max(90),
  perclos: z.number().min(0).max(1),
});

export const createMetricPointsBatchSchema = z.object({
  sessionId: z.string().uuid("Invalid session UUID"),
  points: z.array(singleMetricPointSchema).min(1, "At least one metric point is required"),
});

export const exportQuerySchema = z.object({
  format: z.enum(["csv", "json"]).default("csv"),
});

export type CreateSessionInput = z.infer<typeof createSessionSchema>;
export type UpdateSessionInput = z.infer<typeof updateSessionSchema>;
export type SingleEventInput = z.infer<typeof singleEventSchema>;
export type CreateEventsBatchInput = z.infer<typeof createEventsBatchSchema>;
export type SingleMetricPointInput = z.infer<typeof singleMetricPointSchema>;
export type CreateMetricPointsBatchInput = z.infer<typeof createMetricPointsBatchSchema>;
export type ExportQueryInput = z.infer<typeof exportQuerySchema>;
