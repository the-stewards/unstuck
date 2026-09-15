"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkAccess } from "@/lib/access";

export interface MagicLinkResult {
  success: boolean;
  error?: string;
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
    const { error: verifyError } = await supabase.auth.verifyOtp({
      type: "magiclink",
      token_hash: data.properties.hashed_token,
      email,
    });

    if (verifyError) {
      return { success: false, error: verifyError.message };
    }
  } catch {
    return { success: false, error: "Something went wrong. Try again in a moment." };
  }

  redirect("/dashboard");
}
