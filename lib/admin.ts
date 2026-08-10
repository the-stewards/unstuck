import "server-only";
import { createClient } from "@/lib/supabase/server";

// Admin gate is a static ADMIN_EMAILS allowlist, not a staff table — the LMS
// only ever has two admins (Ryan, Chris), so a role/permissions system would
// be unused abstraction.
export function isAdminEmail(email: string): boolean {
  const allowlist = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  return allowlist.includes(email.trim().toLowerCase());
}

// Was duplicated identically in app/actions/content.ts and app/actions/admin.ts.
export async function requireAdminEmail(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email || !isAdminEmail(user.email)) {
    throw new Error("Not authorized.");
  }

  return user.email;
}
