"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { grantAccess, getAccessGrant } from "@/lib/access";
import { sendAccessGrantedEmail } from "@/lib/notify";
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
