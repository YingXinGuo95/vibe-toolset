import { createClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client for server-side operations.
 * Bypasses RLS — only use inside API routes.
 */
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}
