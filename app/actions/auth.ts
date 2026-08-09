"use server";

import { createClient } from "@/lib/supabase/server";

export interface MagicLinkResult {
  success: boolean;
  error?: string;
}

// Plain login-screen magic link (and its self-serve "resend" variant) goes
// through Supabase's own auth email. Deliverability (SPF/DKIM/DMARC, sending
// domain) is a Supabase SMTP dashboard setting pointed at Resend — not code
// — see handoff/phase-2-report-lms.md.
export async function requestMagicLink(formData: FormData): Promise<MagicLinkResult> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  if (!email || !email.includes("@")) {
    return { success: false, error: "Enter a valid email address." };
  }

  // Wrapped end-to-end: this action must always resolve to a MagicLinkResult,
  // never throw. LoginForm awaits it directly with no try/catch of its own —
  // an uncaught exception here surfaces as Next's generic full-page error
  // boundary instead of the inline "something went wrong" state.
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/confirm?next=/dashboard`,
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch {
    return { success: false, error: "Something went wrong. Try again in a moment." };
  }
}
