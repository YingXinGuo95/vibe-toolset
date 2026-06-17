import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the Supabase Auth session by reading the user's cookies
 * and updating them if the access token has expired.
 *
 * Must be called early in the middleware chain so that Server Components
 * and Route Handlers receive a fresh session token.
 *
 * @returns A NextResponse with updated auth cookies. The caller should
 *          merge these cookies into the final response.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
          // Apply cache headers to prevent CDN from caching auth responses
          Object.entries(headers).forEach(([key, value]) =>
            supabaseResponse.headers.set(key, value)
          );
        },
      },
    }
  );

  // IMPORTANT: Do not run any code between createServerClient and getUser.
  // A simple mistake here can make it very hard to debug session issues.
  await supabase.auth.getUser();

  return supabaseResponse;
}
