"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkAccess } from "@/lib/access";
import { sanitizeRef } from "@/lib/ref";

export interface MagicLinkResult {
  success: boolean;
  error?: string;
  // True when a real link was emailed (new signup); the person must open it.
  emailed?: boolean;
}

// New signups: a real emailed link proves inbox ownership before an account is
// confirmed. Off unless ALLOW_SIGNUP_LINKS=true, so by default an email with no
// access grant is still turned away exactly as before.
function signupLinksEnabled(): boolean {
  return process.env.ALLOW_SIGNUP_LINKS === "true";
}

async function sendSignupLink(email: string, ref: string | null): Promise<MagicLinkResult> {
  const origin = new URL(process.env.NEXT_PUBLIC_APP_URL || "https://unstuck.stewards.loan").origin;
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: `${origin}/auth/confirm?next=/dashboard`,
      // Stored on the new user so the channel survives opening the link in a
      // different browser. Reporting only: it is never sent to Meta.
      ...(ref ? { data: { signup_ref: ref } } : {}),
    },
  });
  if (error) {
    return { success: false, error: "We couldn't send that link. Try again in a moment." };
  }
  return { success: true, emailed: true };
}

// Instant login, no email round-trip: generates a magic-link token via the
// admin API and verifies it server-side in the same request instead of
// emailing it for the student to click later. access_grants is the real
// content gate either way (see requireStudent()) — proving inbox ownership
// on top of that added friction without raising the bar much, since typing
// a granted student's email here only ever reaches that student's own
// course progress, nothing more sensitive. Still rejects any email with no
// access_grants row, so this isn't open signup.
export async function requestMagicLink(formData: FormData): Promise<MagicLinkResult> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  if (!email || !email.includes("@")) {
    return { success: false, error: "Enter a valid email address." };
  }

  try {
    const hasAccess = await checkAccess(email);
    if (!hasAccess) {
      if (signupLinksEnabled()) {
        return await sendSignupLink(email, sanitizeRef(formData.get("ref")));
      }
      return { success: false, error: "We don't have access on file for that email." };
    }

    const admin = createAdminClient();
    const { data, error: linkError } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
    });

    if (linkError) {
      return { success: false, error: linkError.message };
    }

    const supabase = await createClient();
    // Supabase rejects `email` alongside `token_hash` — that combination is
    // only valid for the 6-digit-code verification path, not this one.
    const { error: verifyError } = await supabase.auth.verifyOtp({
      type: "magiclink",
      token_hash: data.properties.hashed_token,
    });

    if (verifyError) {
      return { success: false, error: verifyError.message };
    }
  } catch {
    return { success: false, error: "Something went wrong. Try again in a moment." };
  }

  redirect("/dashboard");
}
