import { NextResponse } from "next/server";
import { getAuthenticatedContext } from "@/lib/api/auth";
import { createEventsBatchSchema } from "@/lib/api/schemas";

/**
 * POST /api/events
 * Batched insertion of physiological advisory events (Notice, Warning, Critical)
 * triggered during a driver monitoring session.
 */
export async function POST(request: Request) {
  try {
    const { userId, supabase } = await getAuthenticatedContext();

    const body = await request.json();
    const validation = createEventsBatchSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { sessionId, events } = validation.data;

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

    // Prepare rows for batch insert
    const rows = events.map((event) => ({
      session_id: sessionId,
      user_id: userId,
      timestamp_sec: event.timestampSec,
      level: event.level,
      score: event.score,
      reason: event.reason,
    }));

    const { data, error } = await supabase.from("events").insert(rows).select();

    if (error) {
      console.error("[DriveGuard API] Error batching events:", error.message);
      return NextResponse.json(
        { error: "Failed to insert events", details: error.message },
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
    console.error("[DriveGuard API] Unexpected error in batched events:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
