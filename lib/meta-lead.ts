import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { isMetaCapiConfigured, sendMetaLead } from "@/lib/meta-capi";

// Reports each qualified RSVP to Meta exactly once. leads.meta_lead_sent_at is
// the "done" flag: set only after Meta confirms receipt, so a failed or slow
// call is retried (by retryUnsentMetaLeads, run from the 5-minute scheduler).
// The event_id is the lead id, so a retry that races the first attempt still
// counts once on Meta's side.

const RETRY_WINDOW_MS = 3 * 24 * 60 * 60 * 1000; // Meta accepts up to 7 days
const RETRY_LIMIT = 20;

async function markSent(leadId: string): Promise<void> {
  const { error } = await createAdminClient()
    .from("leads")
    .update({ meta_lead_sent_at: new Date().toISOString() })
    .eq("id", leadId)
    .is("meta_lead_sent_at", null);
  // If this write fails the retry resends the same event_id: Meta de-duplicates it.
  if (error) console.error("meta_lead_sent_at update failed:", error.message);
}

export interface QualifiedLead {
  id: string;
  email: string;
  ip?: string | null;
  userAgent?: string | null;
}

// Called inline when the RSVP is saved. Never throws.
export async function reportLeadToMeta(lead: QualifiedLead): Promise<void> {
  if (!isMetaCapiConfigured()) return;
  try {
    const ok = await sendMetaLead({ eventId: lead.id, email: lead.email, ip: lead.ip, userAgent: lead.userAgent });
    if (ok) await markSent(lead.id);
  } catch (err) {
    console.error("reportLeadToMeta failed:", err instanceof Error ? err.message : "error");
  }
}

export interface MetaRetryResult {
  skipped?: true;
  considered: number;
  sent: number;
  failed: number;
}

// Sends any qualified RSVP from the last 3 days that Meta hasn't confirmed yet.
export async function retryUnsentMetaLeads(now: Date = new Date()): Promise<MetaRetryResult> {
  if (!isMetaCapiConfigured()) return { skipped: true, considered: 0, sent: 0, failed: 0 };

  const since = new Date(now.getTime() - RETRY_WINDOW_MS).toISOString();
  const { data, error } = await createAdminClient()
    .from("leads")
    .select("id, email, ip, user_agent, created_at")
    .is("meta_lead_sent_at", null)
    .eq("homeowner_status", "owner_central_ohio")
    .gte("created_at", since)
    .order("created_at", { ascending: true })
    .limit(RETRY_LIMIT);
  if (error) throw error;

  let sent = 0;
  let failed = 0;
  for (const lead of data ?? []) {
    const ok = await sendMetaLead({
      eventId: lead.id,
      email: lead.email,
      ip: lead.ip,
      userAgent: lead.user_agent,
      eventTime: Math.floor(new Date(lead.created_at).getTime() / 1000),
    });
    if (ok) {
      await markSent(lead.id);
      sent += 1;
    } else {
      failed += 1;
    }
  }
  return { considered: data?.length ?? 0, sent, failed };
}
