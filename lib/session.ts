import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { checkAccess, grantAccess } from "@/lib/access";
import { isAdminEmail } from "@/lib/admin";

// Used by every page under /dashboard and /module — signed in AND has an
// access_grants row. The LMS never distinguishes how access was granted here.
//
// UNSTUCK is free. A session only exists for someone who either already has a
// grant (instant login is limited to granted emails) or confirmed their inbox
// through an emailed link, so a signed-in user without a grant is a new free
// signup: grant access now instead of sending them to a purchase page.
export async function requireStudent() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    redirect("/login");
  }

  const hasAccess = await checkAccess(user.email);
  if (!hasAccess) {
    try {
      await grantAccess({ email: user.email, source: "free_signup" });
    } catch (err) {
      // Never strand someone on an error page: send them back to sign in.
      console.error("free access grant failed:", err instanceof Error ? err.message : "error");
      redirect("/login");
    }
  }

  return user;
}

export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email || !isAdminEmail(user.email)) {
    redirect("/login");
  }

  return user;
}
