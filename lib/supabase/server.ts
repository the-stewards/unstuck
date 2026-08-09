import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

// Used from Server Components, Server Actions, and Route Handlers. Session
// cookie refresh is normally handled by proxy.ts on every request; the
// try/catch below only matters when this is called from a Server Component
// render, where Next disallows writing cookies.
//
// Not parameterized with Database — see lib/types.ts for why.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component — proxy.ts refreshes the session.
          }
        },
      },
    }
  );
}
