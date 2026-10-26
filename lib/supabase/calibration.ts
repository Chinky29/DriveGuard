/**
 * DriveGuard User Calibration Persistence Service
 *
 * Implements Phase 2 Requirement 4: Save and load user's facial baseline calibration
 * via Supabase with Clerk Row Level Security.
 */

import { SupabaseClient } from "@supabase/supabase-js";
import { CalibratedThresholds } from "@/lib/detection/calibration";

export interface CalibrationDbRow {
  readonly id: string;
  readonly user_id: string;
  readonly baseline_ear: number;
  readonly baseline_mar: number;
  readonly ear_low_threshold: number;
  readonly ear_very_low_threshold: number;
  readonly ear_reopen_threshold: number;
  readonly mar_open_threshold: number;
  readonly is_default: boolean;
  readonly sample_count: number;
  readonly created_at: string;
  readonly updated_at: string;
}

/**
 * Ensures user profile exists in Supabase profiles table before saving calibration.
 */
export async function ensureUserProfile(
  supabase: SupabaseClient,
  userId: string,
  email?: string
): Promise<void> {
  try {
    await supabase.from("profiles").upsert(
      {
        id: userId,
        email: email || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );
  } catch {
    // Non-fatal if profile already exists or RLS handles it
  }
}

/**
 * Saves or updates a driver's personalized baseline calibration in Supabase.
 */
export async function saveUserCalibration(
  supabase: SupabaseClient,
  userId: string,
  calibration: CalibratedThresholds,
  userEmail?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await ensureUserProfile(supabase, userId, userEmail);

    const { error } = await supabase.from("calibrations").upsert(
      {
        user_id: userId,
        baseline_ear: calibration.baselineEAR,
        baseline_mar: calibration.baselineMAR,
        ear_low_threshold: calibration.earLowThreshold,
        ear_very_low_threshold: calibration.earVeryLowThreshold,
        ear_reopen_threshold: calibration.earReopenThreshold,
        mar_open_threshold: calibration.marOpenThreshold,
        is_default: calibration.isDefault,
        sample_count: calibration.sampleCount,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

    if (error) {
      console.error("[DriveGuard] Failed to save calibration to Supabase:", error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[DriveGuard] Error saving user calibration:", message);
    return { success: false, error: message };
  }
}

/**
 * Loads a driver's personalized baseline calibration from Supabase.
 */
export async function loadUserCalibration(
  supabase: SupabaseClient,
  userId: string
): Promise<CalibratedThresholds | null> {
  try {
    const { data, error } = await supabase
      .from("calibrations")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.warn("[DriveGuard] Could not load calibration from Supabase:", error.message);
      return null;
    }

    if (!data) {
      return null;
    }

    const row = data as CalibrationDbRow;
    return {
      baselineEAR: Number(row.baseline_ear),
      baselineMAR: Number(row.baseline_mar),
      earLowThreshold: Number(row.ear_low_threshold),
      earVeryLowThreshold: Number(row.ear_very_low_threshold),
      earReopenThreshold: Number(row.ear_reopen_threshold),
      marOpenThreshold: Number(row.mar_open_threshold),
      isDefault: Boolean(row.is_default),
      sampleCount: Number(row.sample_count),
    };
  } catch (err: unknown) {
    console.warn("[DriveGuard] Error loading user calibration:", err);
    return null;
  }
}
