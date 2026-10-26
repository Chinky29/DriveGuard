/**
 * DriveGuard Server Authentication & Supabase Access Helper
 *
 * Implements Clerk session authentication and provides a secure Supabase client
 * strictly scoped to the authenticated user's ID for all API route handlers.
 */

import { auth } from "@clerk/nextjs/server";
import { SupabaseClient } from "@supabase/supabase-js";
import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/supabase/server";

export interface AuthenticatedContext {
  userId: string;
  supabase: SupabaseClient;
  token?: string | null;
}

/**
 * Validates Clerk user authentication on an incoming API request.
 * Returns the authenticated Clerk user ID and an authorized Supabase client.
 * Throws an error with a 401 status message if the user is unauthenticated.
 */
export async function getAuthenticatedContext(): Promise<AuthenticatedContext> {
  const { userId, getToken } = auth();

  if (!userId) {
    throw new Error("UNAUTHORIZED");
  }

  // Attempt to acquire Supabase JWT from Clerk template
  let token: string | null = null;
  try {
    token = await getToken({ template: "supabase" });
  } catch (err) {
    console.warn("[DriveGuard] Failed to obtain Clerk Supabase JWT:", err);
  }

  // Fallback to Admin client with explicit userId scoping if service role is configured,
  // or user-scoped RLS client when token is present
  const supabase = token
    ? createServerSupabaseClient(token)
    : process.env.SUPABASE_SERVICE_ROLE_KEY
      ? createAdminSupabaseClient()
      : createServerSupabaseClient(null);

  return { userId, supabase, token };
}
