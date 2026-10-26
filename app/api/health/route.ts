import { NextResponse } from "next/server";

/**
 * Health check endpoint for DriveGuard service
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "DriveGuard",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: "0.1.0",
  });
}
