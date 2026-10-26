import { NextResponse } from "next/server";
import { getAuthenticatedContext } from "@/lib/api/auth";
import { createMetricPointsBatchSchema } from "@/lib/api/schemas";

/**
 * POST /api/telemetry
 * Ingests a batch of numerical telemetry points collected every 5s from the driver monitor.
 * Implements Rule 3 (Privacy by Design): Only pure numerical metrics are stored, never video frames.
 */
export async function POST(request: Request) {
  try {
    const { userId, supabase } = await getAuthenticatedContext();

    const body = await request.json();
    const validation = createMetricPointsBatchSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { sessionId, points } = validation.data;

    // Verify session ownership
    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .select("id")
      .eq("id", sessionId)
      .eq("user_id", userId)
      .maybeSingle();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: "Session not found or forbidden" },
        { status: 404 }
      );
    }

    const rows = points.map((p) => ({
      session_id: sessionId,
      user_id: userId,
      timestamp_sec: p.timestampSec,
      fatigue_score: p.fatigueScore,
      ear: p.ear,
      mar: p.mar,
      pitch: p.pitch,
      yaw: p.yaw,
      roll: p.roll,
      perclos: p.perclos,
    }));

    const { data, error } = await supabase.from("metric_points").insert(rows).select("id");

    if (error) {
      console.error("[DriveGuard API] Error batching metric points:", error.message);
      return NextResponse.json(
        { error: "Failed to store metric points", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        insertedCount: data ? data.length : rows.length,
      },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[DriveGuard API] Unexpected error in telemetry route:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
