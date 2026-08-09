"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { grantAccess, getAccessGrant } from "@/lib/access";
import { sendAccessGrantedEmail } from "@/lib/notify";
import { isAdminEmail } from "@/lib/admin";
import type { CallStatus } from "@/lib/types";

async function requireAdminEmail(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email || !isAdminEmail(user.email)) {
    throw new Error("Not authorized.");
  }

  return user.email;
}

// Admin tool always checks for an existing grant first so a sales call never
// results in an accidental double-grant — the caller renders whatever this
// returns before offering the "grant" button.
export async function checkExistingAccess(email: string) {
  await requireAdminEmail();
  return getAccessGrant(email.trim().toLowerCase());
}

export async function grantManualAccess(email: string) {
  const adminEmail = await requireAdminEmail();
  const normalizedEmail = email.trim().toLowerCase();

  const result = await grantAccess({
    email: normalizedEmail,
    source: "manual_comp",
    grantedBy: adminEmail,
  });

  if (result.granted) {
    await sendAccessGrantedEmail(normalizedEmail);
  }

  return result;
}

export async function setCallStatus(studentEmail: string, status: CallStatus) {
  await requireAdminEmail();

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("students")
    .update({ call_status: status })
    .eq("email", studentEmail.trim().toLowerCase());

  if (error) throw error;
}
