import { createClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client for server-side operations.
 * Bypasses RLS — only use inside API routes.
 *
 * NOTE: Next.js 14 App Router caches fetch() by default (force-cache).
 * Without `cache: "no-store"`, supabase-js queries return stale data
 * because the same PostgREST URL is reused across requests.
 */
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      global: {
        fetch: (input: RequestInfo | URL, init?: RequestInit) =>
          fetch(input, { ...init, cache: "no-store" }),
      },
    },
  );
}
