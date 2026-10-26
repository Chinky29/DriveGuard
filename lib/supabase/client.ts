/**
 * DriveGuard Client-Side Supabase Integration
 *
 * Implements Rule 3 (Privacy by Design) & Security Best Practices:
 * - Browser-safe client using public anon key only
 * - NEVER exposes or imports the service role key
 * - Injects the authenticated Clerk JWT into Supabase request headers
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

/**
 * Creates an anonymous browser-side Supabase client.
 */
export function createBrowserSupabaseClient(): SupabaseClient {
  if (!supabaseUrl || !supabaseAnonKey) {
    // Return dummy/fallback client if env vars are not yet configured
    console.warn(
      "[DriveGuard] Supabase credentials not set. Cloud calibration sync disabled."
    );
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * Creates a browser-side Supabase client authenticated with the Clerk user's JWT.
 * RLS policies in Supabase will automatically scope data access to this user ID.
 */
export function createClerkSupabaseClient(
  clerkToken?: string | null
): SupabaseClient {
  if (!supabaseUrl || !supabaseAnonKey) {
    return createBrowserSupabaseClient();
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: clerkToken ? { Authorization: `Bearer ${clerkToken}` } : {},
    },
  });
}

export const supabaseClient = createBrowserSupabaseClient();
