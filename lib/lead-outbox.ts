import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getLeadForm } from "@/lib/lead-forms";
import { sendAdminAlert } from "@/lib/notify";

// Delivers lead_outbox rows (written atomically with each RSVP by the
// submit_lead SQL function) to a Zapier "Catch Hook" webhook. The form
// response never depends on this: a failure just leaves the row unsent for the
// next flush (the next submission, or the daily cron).

export const OUTBOX_MAX_ATTEMPTS = 5;
const TIMEOUT_MS = 5000;

interface OutboxRow {
  id: string;
  lead_id: string;
  event: string;
  payload: Record<string, unknown>;
  attempts: number;
}

export interface FlushResult {
  sent: number;
  failed: number;
  // True when no webhook URL is configured; rows stay queued.
  skipped: boolean;
}

// Flat JSON, stable field names: this is the contract Zaps map against.
function buildZapierPayload(row: OutboxRow) {
  const p = row.payload;
  const form = getLeadForm(p.form_key);
  return {
    event: row.event,
    outbox_id: row.id,
    lead_id: row.lead_id,
    form_key: p.form_key ?? null,
    event_name: form?.eventName ?? null,
    event_date: form?.eventDate ?? null,
    first_name: p.first_name ?? null,
    last_name: p.last_name ?? null,
    email: p.email ?? null,
    phone: p.phone ?? null,
    sms_consent: p.sms_consent ?? null,
    ref: p.ref ?? null,
    created_at: p.created_at ?? null,
  };
}

async function deliver(url: string, row: OutboxRow): Promise<void> {
  const supabase = createAdminClient();

  // Claim with an optimistic lock on `attempts` so two concurrent flushes
  // (the immediate send and an opportunistic one) never both send this row.
  const { data: claimed, error: claimError } = await supabase
    .from("lead_outbox")
    .update({ attempts: row.attempts + 1 })
    .eq("id", row.id)
    .eq("attempts", row.attempts)
    .is("sent_at", null)
    .select("id");
  if (claimError) throw claimError;
  if (!claimed || claimed.length === 0) return; // someone else has it

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildZapierPayload(row)),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`Zapier responded ${response.status}`);

  const { error } = await supabase
    .from("lead_outbox")
    .update({ sent_at: new Date().toISOString() })
    .eq("id", row.id);
  if (error) throw error;
}

// Send one lead's row (leadId) and/or the oldest unsent rows (limit). Never
// throws: callers are on the request path of a form submission.
export async function flushLeadOutbox(opts: { leadId?: string; limit?: number } = {}): Promise<FlushResult> {
  const url = process.env.ZAPIER_LEADS_WEBHOOK_URL;
  if (!url) return { sent: 0, failed: 0, skipped: true };

  let rows: OutboxRow[] = [];
  try {
    let query = createAdminClient()
      .from("lead_outbox")
      .select("id, lead_id, event, payload, attempts")
      .is("sent_at", null)
      .lt("attempts", OUTBOX_MAX_ATTEMPTS)
      .order("created_at", { ascending: true })
      .limit(opts.limit ?? 10);
    if (opts.leadId) query = query.eq("lead_id", opts.leadId);
    const { data, error } = await query;
    if (error) throw error;
    rows = (data ?? []) as OutboxRow[];
  } catch (err) {
    console.error("lead_outbox read failed:", err);
    return { sent: 0, failed: 0, skipped: false };
  }

  let sent = 0;
  let failed = 0;
  for (const row of rows) {
    try {
      await deliver(url, row);
      sent += 1;
    } catch (err) {
      failed += 1;
      console.error(`lead_outbox ${row.id} delivery failed (attempt ${row.attempts + 1}):`, err);
      if (row.attempts + 1 >= OUTBOX_MAX_ATTEMPTS) {
        // Out of retries: the one failure that must not be silent.
        await sendAdminAlert(
          "Lead not delivered to Zapier",
          `Lead <code>${row.lead_id}</code> (outbox <code>${row.id}</code>) failed ${OUTBOX_MAX_ATTEMPTS} times and will not be retried: ${(err as Error).message}`
        );
      }
    }
  }
  return { sent, failed, skipped: false };
}
