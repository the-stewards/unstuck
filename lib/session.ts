import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { checkAccess } from "@/lib/access";
import { isAdminEmail } from "@/lib/admin";

// Used by every page under /dashboard and /module — signed in AND has an
// access_grants row. The LMS never distinguishes how access was granted here.
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
    redirect("/purchase");
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
