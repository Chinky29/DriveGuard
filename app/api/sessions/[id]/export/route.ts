import { NextResponse } from "next/server";
import { getAuthenticatedContext } from "@/lib/api/auth";
import { exportQuerySchema } from "@/lib/api/schemas";
import {
  formatSessionAsCsv,
  formatSessionAsJson,
  SessionExportBundle,
} from "@/lib/api/export";

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * GET /api/sessions/[id]/export?format=csv|json
 * Exports a driver monitoring session's complete telemetry and event log.
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { userId, supabase } = await getAuthenticatedContext();
    const sessionId = params.id;

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID is required" }, { status: 400 });
    }

    const url = new URL(request.url);
    const formatParam = url.searchParams.get("format") || "csv";
    const validation = exportQuerySchema.safeParse({ format: formatParam });
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid format. Supported: csv, json" },
        { status: 400 }
      );
    }
    const format = validation.data.format;

    // 1. Fetch session record
    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .select("*")
      .eq("id", sessionId)
      .eq("user_id", userId)
      .maybeSingle();

    if (sessionError || !session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // 2. Fetch events
    const { data: events } = await supabase
      .from("events")
      .select("*")
      .eq("session_id", sessionId)
      .eq("user_id", userId)
      .order("timestamp_sec", { ascending: true });

    // 3. Fetch metric points (limit to 2000 points to ensure performant download)
    const { data: metrics } = await supabase
      .from("metric_points")
      .select("*")
      .eq("session_id", sessionId)
      .eq("user_id", userId)
      .order("timestamp_sec", { ascending: true })
      .limit(2000);

    const bundle: SessionExportBundle = {
      session: {
        id: session.id,
        userId: session.user_id,
        startTime: session.start_time,
        endTime: session.end_time,
        durationSeconds: session.duration_seconds,
        avgFatigueScore: Number(session.avg_fatigue_score),
        peakFatigueScore: session.peak_fatigue_score,
        noticeCount: session.notice_count,
        warningCount: session.warning_count,
        criticalCount: session.critical_count,
        createdAt: session.created_at,
      },
      events: (events || []).map((e) => ({
        id: e.id,
        sessionId: e.session_id,
        timestampSec: Number(e.timestamp_sec),
        level: e.level as "Notice" | "Warning" | "Critical",
        score: e.score,
        reason: e.reason,
        createdAt: e.created_at,
      })),
      metrics: (metrics || []).map((m) => ({
        id: m.id,
        sessionId: m.session_id,
        timestampSec: Number(m.timestamp_sec),
        fatigueScore: m.fatigue_score,
        ear: Number(m.ear),
        mar: Number(m.mar),
        pitch: Number(m.pitch),
        yaw: Number(m.yaw),
        roll: Number(m.roll),
        perclos: Number(m.perclos),
        createdAt: m.created_at,
      })),
    };

    if (format === "json") {
      const jsonData = formatSessionAsJson(bundle);
      return new NextResponse(JSON.stringify(jsonData, null, 2), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="driveguard-session-${sessionId.slice(0, 8)}.json"`,
        },
      });
    }

    // Default: CSV format
    const csvData = formatSessionAsCsv(bundle);
    return new NextResponse(csvData, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="driveguard-session-${sessionId.slice(0, 8)}.csv"`,
      },
    });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[DriveGuard API] Unexpected export error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
