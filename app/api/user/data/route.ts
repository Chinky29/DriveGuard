import { NextResponse } from "next/server";
import { getAuthenticatedContext } from "@/lib/api/auth";

/**
 * DELETE /api/user/data
 * GDPR & Privacy Compliance endpoint: Permanently deletes all personal data,
 * facial baseline calibrations, sessions, events, and metric points for the driver.
 */
export async function DELETE() {
  try {
    const { userId, supabase } = await getAuthenticatedContext();

    // 1. Delete user calibrations
    await supabase.from("calibrations").delete().eq("user_id", userId);

    // 2. Delete all user sessions (foreign keys cascade to events & metric_points)
    await supabase.from("sessions").delete().eq("user_id", userId);

    // 3. Delete user events directly (in case of orphan records)
    await supabase.from("events").delete().eq("user_id", userId);

    // 4. Delete user metric points
    await supabase.from("metric_points").delete().eq("user_id", userId);

    // 5. Delete profile record
    await supabase.from("profiles").delete().eq("id", userId);

    return NextResponse.json({
      success: true,
      message: "All user telemetry, sessions, and calibration records permanently deleted.",
    });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[DriveGuard API] Error deleting user data:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
