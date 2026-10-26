import { NextResponse } from "next/server";
import { z } from "zod";

const predictSchema = z.object({
  predictType: z.enum(["eye", "emotion"]),
  image: z.string().min(1, "Image base64 data is required"),
  serviceUrl: z.string().url().optional(),
});

const DEFAULT_SERVICE_URL =
  process.env.NEXT_PUBLIC_ENHANCED_SERVICE_URL || "http://localhost:5001";

/**
 * POST /api/enhanced/predict
 * Non-blocking proxy to the optional Python Enhanced ML service.
 * Enforces strict 1.5s timeout and graceful fallback if service is offline.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = predictSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid prediction request", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { predictType, image, serviceUrl } = validation.data;
    const rawUrl = serviceUrl || DEFAULT_SERVICE_URL;
    const baseUrl = rawUrl.replace("localhost", "127.0.0.1");
    const endpoint =
      predictType === "eye" ? `${baseUrl}/predict-eye` : `${baseUrl}/predict-emotion`;

    // Strict timeout controller to avoid hanging the client
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1500);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return NextResponse.json({
          available: false,
          fallback: true,
          error: `Service returned HTTP ${response.status}`,
        });
      }

      const result = await response.json();
      return NextResponse.json({
        available: true,
        data: result,
      });
    } catch (fetchErr: unknown) {
      clearTimeout(timeoutId);
      // Service offline or timeout - return graceful fallback response
      return NextResponse.json({
        available: false,
        fallback: true,
        error: "Enhanced ML service unreachable or timed out. On-device pipeline active.",
      });
    }
  } catch (err: unknown) {
    return NextResponse.json(
      {
        available: false,
        fallback: true,
        error: "Internal proxy error. Core detection remains active on device.",
      },
      { status: 200 } // Keep 200 so client detection loop is never disrupted
    );
  }
}
