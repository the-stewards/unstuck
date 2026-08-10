import "server-only";
import { requireAdminEmail } from "@/lib/admin";

// Next.js masks the real message of anything *thrown* out of a Server
// Action in production (shows a generic digest-only error instead) — the
// only reliable way to get a specific message to the client is to return it
// as data. Every admin-gated action funnels through this so a real failure
// (auth, validation, a Supabase error) always reaches the UI as readable
// text instead of "Minified React error #441."
export type ActionResult<T = void> = { success: true; data: T } | { success: false; error: string };

// Supabase's PostgrestError (thrown directly as `error` from `if (error)
// throw error` throughout app/actions/*) is a plain object shaped like
// {code, message, details, hint} — not a native Error instance — so
// `err instanceof Error` misses it and silently falls back to a generic
// message, hiding the real reason (e.g. "column content_url does not
// exist"). Duck-typing the .message field catches both cases.
function extractMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (
    typeof err === "object" &&
    err !== null &&
    "message" in err &&
    typeof (err as { message: unknown }).message === "string"
  ) {
    return (err as { message: string }).message;
  }
  return "Something went wrong. Try again.";
}

export async function runAdminAction<T>(fn: (adminEmail: string) => Promise<T>): Promise<ActionResult<T>> {
  try {
    const adminEmail = await requireAdminEmail();
    const data = await fn(adminEmail);
    return { success: true, data };
  } catch (err) {
    return { success: false, error: extractMessage(err) };
  }
}
