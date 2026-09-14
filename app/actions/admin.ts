"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { grantAccess, getAccessGrant } from "@/lib/access";
import { sendAccessGrantedEmail, generateMagicLink } from "@/lib/notify";
import { runAdminAction, type ActionResult } from "@/lib/action-result";
import type { AccessGrant, CallStatus } from "@/lib/types";

// Admin tool always checks for an existing grant first so a sales call never
// results in an accidental double-grant — the caller renders whatever this
// returns before offering the "grant" button.
export async function checkExistingAccess(email: string): Promise<ActionResult<AccessGrant | null>> {
  return runAdminAction(() => getAccessGrant(email.trim().toLowerCase()));
}

export async function grantManualAccess(
  email: string
): Promise<ActionResult<{ granted: boolean; alreadyGranted: boolean }>> {
  return runAdminAction(async (adminEmail) => {
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
  });
}

// For a student who already has a grant but never got (or lost) the
// original delivery email — grantAccess() is idempotent and won't
// re-send on its own, so this bypasses it and re-fires the email
// directly against a fresh magic link. Admin-gated the same as every
// other action here; does not touch the access_grants row at all.
export async function resendAccessEmail(email: string): Promise<ActionResult> {
  return runAdminAction(async () => {
    const normalizedEmail = email.trim().toLowerCase();
    const existing = await getAccessGrant(normalizedEmail);
    if (!existing) throw new Error("No access grant on file for this email.");
    await sendAccessGrantedEmail(normalizedEmail);
  });
}

// Hands back the raw magic link instead of emailing it — for when email
// delivery itself is the broken part (spam filtering, a mistyped inbox
// the student can't fix, etc.) and Ryan needs to deliver it by text or
// some other channel himself. Same admin gate and existing-grant check
// as resendAccessEmail; Supabase's own OTP expiry window still applies,
// so this is meant to be sent right after copying, not stockpiled.
export async function getAccessLink(email: string): Promise<ActionResult<string>> {
  return runAdminAction(async () => {
    const normalizedEmail = email.trim().toLowerCase();
    const existing = await getAccessGrant(normalizedEmail);
    if (!existing) throw new Error("No access grant on file for this email.");
    return generateMagicLink(normalizedEmail);
  });
}

// Reactivates every bonus this student hasn't already gotten some other
// way. Only touches rows that are missing or still locked_missed — never
// downgrades a bonus that was already included_at_purchase or previously
// reactivated (also makes this safe to call more than once for the same
// student without resetting reactivated_at each time).
async function reactivateBonuses(studentEmail: string): Promise<void> {
  const supabase = createAdminClient();

  const [{ data: bonuses, error: bonusesError }, { data: existing, error: existingError }] =
    await Promise.all([
      supabase.from("bonuses").select("id"),
      supabase.from("student_bonus_status").select("bonus_id, status").eq("student_email", studentEmail),
    ]);

  if (bonusesError) throw bonusesError;
  if (existingError) throw existingError;

  const statusByBonusId = new Map(
    ((existing ?? []) as { bonus_id: string; status: string }[]).map((row) => [row.bonus_id, row.status])
  );

  const rowsToUpsert = ((bonuses ?? []) as { id: string }[])
    .filter((bonus) => {
      const currentStatus = statusByBonusId.get(bonus.id);
      return !currentStatus || currentStatus === "locked_missed";
    })
    .map((bonus) => ({
      student_email: studentEmail,
      bonus_id: bonus.id,
      status: "reactivated" as const,
      reactivated_at: new Date().toISOString(),
    }));

  if (rowsToUpsert.length === 0) return;

  const { error: upsertError } = await supabase
    .from("student_bonus_status")
    .upsert(rowsToUpsert, { onConflict: "student_email,bonus_id" });

  if (upsertError) throw upsertError;
}

export async function setCallStatus(studentEmail: string, status: CallStatus): Promise<ActionResult> {
  return runAdminAction(async () => {
    const normalizedEmail = studentEmail.trim().toLowerCase();

    const supabase = createAdminClient();
    const { error } = await supabase
      .from("students")
      .update({ call_status: status })
      .eq("email", normalizedEmail);

    if (error) throw error;

    // Marking a call "completed" is what actually unlocks bonuses — booking
    // alone doesn't (see CtaBanner's copy for the "booked" state: "no need to
    // do anything else here", not "you're unlocked").
    if (status === "completed") {
      await reactivateBonuses(normalizedEmail);
    }
  });
}
