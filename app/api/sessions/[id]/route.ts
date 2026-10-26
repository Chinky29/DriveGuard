import { NextResponse } from "next/server";
import { getAuthenticatedContext } from "@/lib/api/auth";
import { updateSessionSchema } from "@/lib/api/schemas";

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * GET /api/sessions/[id]
 * Retrieves full details for a single monitoring session, including physiological events.
 */
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { userId, supabase } = await getAuthenticatedContext();
    const sessionId = params.id;

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID is required" }, { status: 400 });
    }

    // Fetch session ensuring ownership
    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .select("*")
      .eq("id", sessionId)
      .eq("user_id", userId)
      .maybeSingle();

    if (sessionError) {
      console.error("[DriveGuard API] Error fetching session:", sessionError.message);
      return NextResponse.json({ error: "Failed to fetch session" }, { status: 500 });
    }

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Fetch associated events
    const { data: events, error: eventsError } = await supabase
      .from("events")
      .select("*")
      .eq("session_id", sessionId)
      .eq("user_id", userId)
      .order("timestamp_sec", { ascending: true });

    if (eventsError) {
      console.error("[DriveGuard API] Error fetching events:", eventsError.message);
    }

    return NextResponse.json({
      session,
      events: events || [],
    });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[DriveGuard API] Unexpected error in session detail:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PATCH /api/sessions/[id]
 * Updates summary telemetry when a session concludes or pauses.
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { userId, supabase } = await getAuthenticatedContext();
    const sessionId = params.id;

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID is required" }, { status: 400 });
    }

    const body = await request.json();
    const validation = updateSessionSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const {
      endTime,
      durationSeconds,
      avgFatigueScore,
      peakFatigueScore,
      noticeCount,
      warningCount,
      criticalCount,
    } = validation.data;

    const updates: Record<string, unknown> = {};
    if (endTime !== undefined) updates.end_time = endTime;
    if (durationSeconds !== undefined) updates.duration_seconds = durationSeconds;
    if (avgFatigueScore !== undefined) updates.avg_fatigue_score = avgFatigueScore;
    if (peakFatigueScore !== undefined) updates.peak_fatigue_score = peakFatigueScore;
    if (noticeCount !== undefined) updates.notice_count = noticeCount;
    if (warningCount !== undefined) updates.warning_count = warningCount;
    if (criticalCount !== undefined) updates.critical_count = criticalCount;

    const { data, error } = await supabase
      .from("sessions")
      .update(updates)
      .eq("id", sessionId)
      .eq("user_id", userId)
      .select()
      .maybeSingle();

    if (error) {
      console.error("[DriveGuard API] Error updating session:", error.message);
      return NextResponse.json(
        { error: "Failed to update session", details: error.message },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json({ error: "Session not found or forbidden" }, { status: 404 });
    }

    return NextResponse.json({ session: data });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[DriveGuard API] Unexpected error in session patch:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/sessions/[id]
 * Deletes a session and its associated metrics and events.
 */
export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const { userId, supabase } = await getAuthenticatedContext();
    const sessionId = params.id;

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID is required" }, { status: 400 });
    }

    const { error } = await supabase
      .from("sessions")
      .delete()
      .eq("id", sessionId)
      .eq("user_id", userId);

    if (error) {
      console.error("[DriveGuard API] Error deleting session:", error.message);
      return NextResponse.json({ error: "Failed to delete session" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
