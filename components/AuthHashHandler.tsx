"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// This Supabase project's magic-link verify redirect uses the implicit flow
// — tokens land in the URL fragment (#access_token=...&refresh_token=...),
// which only ever reaches client-side JS; the server never sees a fragment.
// Without this, requireStudent() finds no session and bounces straight back
// to /login, and the access_token in the URL is silently dropped — the
// entire login flow was a dead end. Renders in the root layout so it runs
// wherever the redirect chain lands (often /login, since /dashboard's own
// server-side check redirects there first before this ever gets to run).
export function AuthHashHandler() {
  const router = useRouter();

  useEffect(() => {
    if (!window.location.hash.includes("access_token")) return;

    const params = new URLSearchParams(window.location.hash.slice(1));
    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");
    if (!access_token || !refresh_token) return;

    const supabase = createClient();
    supabase.auth.setSession({ access_token, refresh_token }).then(({ error }) => {
      window.history.replaceState(null, "", window.location.pathname);
      if (!error) {
        router.replace("/dashboard");
      }
    });
  }, [router]);

  return null;
}
