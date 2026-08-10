import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Real magic-link emails (sent via signInWithOtp from a Server Action) use
// the PKCE flow: Supabase's own verify redirect lands here with ?code=...,
// not the #access_token=... implicit-flow fragment AuthHashHandler covers.
// The two flows genuinely differ by how the link was generated — PKCE needs
// the requesting browser to have a code_verifier cookie, which only exists
// when signInWithOtp was called on behalf of an actual browser session (as
// it is here); admin.generateLink() (used for the post-purchase access
// email in lib/notify.ts) has no such browser to tie a verifier to, so it
// can only ever produce implicit-flow links. Both are real, both needed.
// Guards against an open redirect via ?next= — without this, a value like
// "@evil.com" or "//evil.com" concatenated onto origin can be parsed by a
// browser as a different host entirely, not a path on this site.
function safeNext(value: string | null): string {
  if (value && value.startsWith("/") && !value.startsWith("//")) {
    return value;
  }
  return "/dashboard";
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=invalid_link`);
}
