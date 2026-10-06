import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getLeadForm } from "@/lib/lead-forms";
import { sessionTimeLabel } from "@/lib/lead-calendar";
import { sendSessionReminderEmail, type ReminderKind } from "@/lib/reminder-emails";
import { unsubscribeUrl } from "@/lib/unsubscribe";

const MIN = 60_000;
const HOUR = 3_600_000;

// Which reminders are due for one RSVP, given the session it was FOR (sessionAt)
// and when it was made (rsvpAt). The windows are deliberately forgiving (a late
// cron run still sends) but bounded (never send "tomorrow" 10 hours later).
// Reminders whose moment had already passed when the person RSVPed are skipped:
// someone who registers Wednesday night gets the 1-hour and starting-now emails,
// not the 24-hour one.
export function dueReminderKinds(sessionAt: Date, rsvpAt: Date, now: Date, sessionMinutes: number): ReminderKind[] {
  const s = sessionAt.getTime();
  const n = now.getTime();
  const c = rsvpAt.getTime();
  const out: ReminderKind[] = [];
  if (n >= s - 24 * HOUR && n < s - 12 * HOUR && c < s - 24 * HOUR) out.push("t24h");
  if (n >= s - HOUR && n < s - 20 * MIN && c < s - HOUR) out.push("t1h");
  if (n >= s && n < s + 15 * MIN && c < s) out.push("tnow");
  if (n >= s + (sessionMinutes + 30) * MIN && n < s + 24 * HOUR) out.push("after");
  return out;
}

export interface ReminderRunResult {
  considered: number;
  sent: number;
  skippedSuppressed: number;
  failed: number;
}

interface LeadRow {
  id: string;
  email: string;
  first_name: string;
  form_key: string;
  session_at: string;
  created_at: string;
}

function origin(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "https://unstuck.stewards.loan";
}

// Sends every reminder that is due right now. Safe to run as often as you like
// (every few minutes): lead_reminders' primary key makes each (lead, kind) send
// happen at most once, claimed BEFORE sending so two overlapping runs can't both
// send. A failed send releases its claim so the next run retries it while the
// window is still open.
export async function sendDueReminders(now: Date = new Date()): Promise<ReminderRunResult> {
  const supabase = createAdminClient();
  const result: ReminderRunResult = { considered: 0, sent: 0, skippedSuppressed: 0, failed: 0 };

  const from = new Date(now.getTime() - 25 * HOUR).toISOString();
  const to = new Date(now.getTime() + 25 * HOUR).toISOString();
  const { data, error } = await supabase
    .from("leads")
    .select("id, email, first_name, form_key, session_at, created_at")
    .gte("session_at", from)
    .lte("session_at", to)
    .limit(1000);
  if (error) throw error;
  const leads = (data ?? []) as LeadRow[];
  if (leads.length === 0) return result;

  const { data: suppressed } = await supabase
    .from("email_suppressions")
    .select("email")
    .in("email", leads.map((l) => l.email));
  const suppressedSet = new Set(((suppressed ?? []) as { email: string }[]).map((r) => r.email));

  for (const lead of leads) {
    const form = getLeadForm(lead.form_key);
    if (!form) continue;

    const kinds = dueReminderKinds(
      new Date(lead.session_at),
      new Date(lead.created_at),
      now,
      form.schedule.durationMinutes
    );
    if (kinds.length === 0) continue;
    result.considered += 1;

    if (suppressedSet.has(lead.email)) {
      result.skippedSuppressed += kinds.length;
      continue;
    }

    for (const kind of kinds) {
      const claim = await supabase.from("lead_reminders").insert({ lead_id: lead.id, kind });
      if (claim.error) {
        // 23505 = already sent/claimed by an earlier or concurrent run. Anything
        // else (e.g. table missing) is logged and skipped, never sent unclaimed.
        if (claim.error.code !== "23505") console.error("lead_reminders claim failed:", claim.error);
        continue;
      }

      try {
        await sendSessionReminderEmail({
          email: lead.email,
          firstName: lead.first_name,
          kind,
          timeLabel: sessionTimeLabel(form.schedule),
          joinUrl: form.calendar.joinUrl,
          joinLabel: form.calendar.joinLabel ?? "Join The Session",
          rsvpUrl: form.rsvpPageUrl ?? "https://www.stewards.loan/unstuck",
          unsubscribeUrl: unsubscribeUrl(lead.email, origin()),
        });
        result.sent += 1;
      } catch (err) {
        result.failed += 1;
        console.error(`reminder ${kind} for ${lead.id} failed:`, err);
        await supabase.from("lead_reminders").delete().eq("lead_id", lead.id).eq("kind", kind);
      }
    }
  }
  return result;
}
