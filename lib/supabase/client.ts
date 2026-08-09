import { createBrowserClient } from "@supabase/ssr";

// Not parameterized with Database — see lib/types.ts for why. Call sites in
// lib/ type their own inputs/outputs against the hand-written domain types.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
