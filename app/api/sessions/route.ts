import { NextResponse } from "next/server";
import { getAuthenticatedContext } from "@/lib/api/auth";
import { createSessionSchema } from "@/lib/api/schemas";

/**
 * POST /api/sessions
 * Starts a new monitoring session for the authenticated driver.
 */
export async function POST(request: Request) {
  try {
    const { userId, supabase } = await getAuthenticatedContext();

    let body = {};
    try {
      body = await request.json();
    } catch {
      // Empty body is allowed, defaults to current time
    }

    const validation = createSessionSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const startTime = validation.data.startTime || new Date().toISOString();

    const { data, error } = await supabase
      .from("sessions")
      .insert({
        user_id: userId,
        start_time: startTime,
        duration_seconds: 0,
        avg_fatigue_score: 0,
        peak_fatigue_score: 0,
        notice_count: 0,
        warning_count: 0,
        critical_count: 0,
      })
      .select()
      .single();

    if (error) {
      console.error("[DriveGuard API] Error creating session:", error.message);
      return NextResponse.json(
        { error: "Failed to create session in database", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ session: data }, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[DriveGuard API] Unexpected session create error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * GET /api/sessions
 * Retrieves all monitoring sessions for the authenticated driver.
 */
export async function GET(request: Request) {
  try {
    const { userId, supabase } = await getAuthenticatedContext();

    const url = new URL(request.url);
    const limit = Math.min(Number(url.searchParams.get("limit")) || 20, 100);
    const offset = Math.max(Number(url.searchParams.get("offset")) || 0, 0);

    const { data, error, count } = await supabase
      .from("sessions")
      .select("*", { count: "exact" })
      .eq("user_id", userId)
      .order("start_time", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("[DriveGuard API] Error fetching sessions:", error.message);
      return NextResponse.json(
        { error: "Failed to fetch sessions", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      sessions: data || [],
      total: count || (data ? data.length : 0),
      limit,
      offset,
    });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[DriveGuard API] Unexpected session fetch error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
