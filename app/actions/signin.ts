"use server";

import { headers } from "next/headers";
import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { clientIp } from "@/lib/client-ip";
import { reportFirstVerifiedSignIn } from "@/lib/meta-lead";

// Called by AuthHashHandler right after it turns an emailed implicit-flow link
// (#access_token=...) into a session. That flow's tokens only ever reach the
// browser, so the server learns about the sign-in here. The user is read from
// the session cookie, never from anything the caller sends, and the work runs
// after the response so it can never block or fail a sign-in.
export async function recordVerifiedSignIn(): Promise<void> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.email) return;

    const requestHeaders = await headers();
    const signIn = {
      userId: user.id,
      email: user.email,
      signupRef: user.user_metadata?.signup_ref,
      ip: clientIp(requestHeaders),
      userAgent: requestHeaders.get("user-agent"),
    };
    after(() => reportFirstVerifiedSignIn(signIn));
  } catch (err) {
    console.error("recordVerifiedSignIn failed:", err instanceof Error ? err.message : "error");
  }
}
