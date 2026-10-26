/**
 * DriveGuard Server-Side Supabase Integration
 *
 * Implements Security Best Practices:
 * - Server-only execution. Throws immediately if imported on the client.
 * - Handles authenticated server queries with Clerk user JWT
 * - Isolates the privileged Service Role Key strictly on the backend
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Strict security assertion: Never allow server module in client bundles
if (typeof window !== "undefined") {
  throw new Error(
    "Security Violation: lib/supabase/server.ts must never be imported or executed in client code."
  );
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

/**
 * Creates a server-side Supabase client scoped to a Clerk user token for RLS execution.
 */
export function createServerSupabaseClient(
  clerkToken?: string | null
): SupabaseClient {
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

/**
 * Creates an admin Supabase client with the privileged service role key.
 * Only use for system administration, webhooks, or background tasks.
 */
export function createAdminSupabaseClient(): SupabaseClient {
  if (!supabaseServiceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY environment variable is missing on the server."
    );
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
