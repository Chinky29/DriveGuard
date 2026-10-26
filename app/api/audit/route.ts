import { NextResponse } from "next/server";

/**
 * TODO: Session Telemetry Audit Route
 * Handles batching and export of client driver events without raw image persistence.
 */
export async function GET() {
  return NextResponse.json({
    events: [],
    message: "Audit endpoint ready. No raw frames are stored per Rule 3.",
  });
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    return NextResponse.json({
      received: true,
      count: Array.isArray(payload) ? payload.length : 1,
    });
  } catch {
    return NextResponse.json(
      { error: "Invalid telemetry payload" },
      { status: 400 }
    );
  }
}
