import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Next.js 16 renamed middleware.ts to proxy.ts — see handoff/phase-2-report-lms.md.
// Refreshes the Supabase session cookie on every request so it survives long
// past a single browser session, per the "long-lived session" auth requirement.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  // Session refresh is best-effort. It must never take the whole app down —
  // missing config, a network blip, or an invalid cookie should just mean
  // the session doesn't get refreshed this request, not a 500 on every page
  // (including pages, like /login, that don't need a session at all).
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet, headers) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
            response = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
            Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
          },
        },
      }
    );

    await supabase.auth.getClaims();
  } catch {
    // Fall through and serve the request without a refreshed session.
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
