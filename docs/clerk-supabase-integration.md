# Wiring Clerk Authentication & JWT Tokens into Supabase

This document outlines the exact architecture, cryptographic handshake, and configuration required to authenticate DriveGuard users via Clerk and scope Supabase PostgreSQL tables using Row Level Security (RLS).

---

## 1. Architectural Overview

DriveGuard leverages Clerk for user identity and session management, while Supabase provides scalable PostgreSQL storage for user profiles, baseline calibrations, monitoring sessions, and telemetry metrics.

```text
[ Browser Client ]
       │
       │ 1. User signs in via Clerk (<SignIn /> or custom flow)
       ▼
[ Clerk Auth Service ]
       │
       │ 2. Issues session JWT signed with shared Supabase JWT Secret (HS256)
       ▼
[ Browser Client ]
       │
       │ 3. getToken({ template: "supabase" })
       │ 4. Adds header: "Authorization: Bearer <clerk_token>"
       ▼
[ Supabase PostgREST Gateway ]
       │
       │ 5. Validates JWT signature using Project JWT Secret
       │ 6. Extracts claims: sub (Clerk User ID), email, exp
       ▼
[ PostgreSQL Engine with RLS ]
       │
       │ 7. Evaluates requesting_user_id() = profiles.id / calibrations.user_id
       ▼
[ Filtered Database Records ]
```

---

## 2. JWT Claim Extraction in PostgreSQL

In `supabase/migrations/20261026000000_init_schema.sql`, PostgreSQL extracts the Clerk user ID via a stable SQL helper function:

```sql
CREATE OR REPLACE FUNCTION requesting_user_id() RETURNS TEXT AS $$
  SELECT NULLIF(
    COALESCE(
      current_setting('request.jwt.claims', true)::json->>'sub',
      (current_setting('request.jwt.claim.sub', true))
    ),
    ''
  )::text;
$$ LANGUAGE sql STABLE;
```

When a request arrives from the Supabase client:
1. PostgREST parses the incoming `Authorization: Bearer <token>` header.
2. It sets the session setting `request.jwt.claims` with the payload JSON.
3. `requesting_user_id()` extracts the `sub` claim (`user_2...`).
4. Table RLS policies evaluate `user_id = requesting_user_id()`.

---

## 3. Row Level Security Policies

Every table in DriveGuard enforces RLS scoped to `requesting_user_id()`:

| Table | Policy Name | Permitted Operation | Check / Using Clause |
| :--- | :--- | :--- | :--- |
| `profiles` | "Users can view their own profile" | `SELECT` | `id = requesting_user_id()` |
| `profiles` | "Users can insert their own profile" | `INSERT` | `id = requesting_user_id()` |
| `profiles` | "Users can update their own profile" | `UPDATE` | `id = requesting_user_id()` |
| `calibrations` | "Users can view their own calibration" | `SELECT` | `user_id = requesting_user_id()` |
| `calibrations` | "Users can insert their own calibration" | `INSERT` | `user_id = requesting_user_id()` |
| `calibrations` | "Users can update their own calibration" | `UPDATE` | `user_id = requesting_user_id()` |
| `calibrations` | "Users can delete their own calibration" | `DELETE` | `user_id = requesting_user_id()` |
| `sessions` | "Users can view their own sessions" | `SELECT` | `user_id = requesting_user_id()` |
| `sessions` | "Users can insert their own sessions" | `INSERT` | `user_id = requesting_user_id()` |
| `sessions` | "Users can update their own sessions" | `UPDATE` | `user_id = requesting_user_id()` |
| `sessions` | "Users can delete their own sessions" | `DELETE` | `user_id = requesting_user_id()` |
| `metric_points` | "Users can view their own metric points" | `SELECT` | `user_id = requesting_user_id()` |
| `metric_points` | "Users can insert their own metric points" | `INSERT` | `user_id = requesting_user_id()` |
| `events` | "Users can view their own events" | `SELECT` | `user_id = requesting_user_id()` |
| `events` | "Users can insert their own events" | `INSERT` | `user_id = requesting_user_id()` |

---

## 4. Frontend Integration Pattern

In client components (`app/monitor/page.tsx`):

```typescript
import { useAuth, useUser } from "@clerk/nextjs";
import { createClerkSupabaseClient } from "@/lib/supabase/client";
import { saveUserCalibration, loadUserCalibration } from "@/lib/supabase/calibration";

export default function MonitorPage() {
  const { user } = useUser();
  const { getToken } = useAuth();

  // Load user calibration
  useEffect(() => {
    async function fetchCalibration() {
      if (!user) return;
      const token = await getToken({ template: "supabase" });
      const client = createClerkSupabaseClient(token);
      const calibration = await loadUserCalibration(client, user.id);
      if (calibration) {
        // apply calibration
      }
    }
    fetchCalibration();
  }, [user, getToken]);
}
```

---

## 5. Security & Isolation Rules

1. **Client Isolation**: The browser client imports `lib/supabase/client.ts` only, which strictly references `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
2. **Service Role Protection**: `SUPABASE_SERVICE_ROLE_KEY` is restricted to `lib/supabase/server.ts`, which throws a runtime exception if executed inside a browser window.
3. **No Unauthenticated Leaks**: Anonymous queries without a valid Clerk JWT return empty rows because RLS default behaviour blocks unauthenticated rows when `requesting_user_id()` evaluates to `NULL`.
