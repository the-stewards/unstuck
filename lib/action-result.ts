import "server-only";
import { requireAdminEmail } from "@/lib/admin";

// Next.js masks the real message of anything *thrown* out of a Server
// Action in production (shows a generic digest-only error instead) — the
// only reliable way to get a specific message to the client is to return it
// as data. Every admin-gated action funnels through this so a real failure
// (auth, validation, a Supabase error) always reaches the UI as readable
// text instead of "Minified React error #441."
export type ActionResult<T = void> = { success: true; data: T } | { success: false; error: string };

export async function runAdminAction<T>(fn: (adminEmail: string) => Promise<T>): Promise<ActionResult<T>> {
  try {
    const adminEmail = await requireAdminEmail();
    const data = await fn(adminEmail);
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Something went wrong. Try again." };
  }
}
