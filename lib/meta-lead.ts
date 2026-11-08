import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { isMetaCapiConfigured, personEventId, sendMetaLead } from "@/lib/meta-capi";
import { sanitizeRef } from "@/lib/ref";

// Reports each PERSON to Meta as one Lead, ever, whichever way they arrive:
//   - first verified sign-in through an emailed magic link (reportFirstVerifiedSignIn), or
//   - a qualified webinar RSVP (reportLeadToMeta).
// "Already reported" = students.meta_lead_sent_at OR leads.meta_lead_sent_at for the
// same email, and a successful send marks both. The event_id is derived from the
// email, so even a race between two paths counts once on Meta's side.
// Nothing here throws: a Meta or database problem must never affect a sign-in or RSVP.

const RETRY_WINDOW_MS = 3 * 24 * 60 * 60 * 1000; // Meta accepts up to 7 days
const RETRY_LIMIT = 20;
const QUICK_RETRY_DELAY_MS = 400;

const normalize = (email: string) => email.trim().toLowerCase();

async function alreadyReported(email: string): Promise<boolean> {
  const admin = createAdminClient();
  const [student, lead] = await Promise.all([
    admin.from("students").select("id").eq("email", email).not("meta_lead_sent_at", "is", null).limit(1),
    admin.from("leads").select("id").eq("email", email).not("meta_lead_sent_at", "is", null).limit(1),
  ]);
  if (student.error) throw student.error;
  if (lead.error) throw lead.error;
  return (student.data?.length ?? 0) > 0 || (lead.data?.length ?? 0) > 0;
}

// Mark every record for this person, so no path (or retry) sends them again.
async function markReported(email: string): Promise<void> {
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const [student, lead] = await Promise.all([
    admin.from("students").update({ meta_lead_sent_at: now }).eq("email", email).is("meta_lead_sent_at", null),
    admin.from("leads").update({ meta_lead_sent_at: now }).eq("email", email).is("meta_lead_sent_at", null),
  ]);
  // If a write fails the person may be resent with the same event_id: Meta de-duplicates it.
  if (student.error) console.error("students.meta_lead_sent_at update failed:", student.error.message);
  if (lead.error) console.error("leads.meta_lead_sent_at update failed:", lead.error.message);
}

export interface QualifiedLead {
  id: string;
  email: string;
  ip?: string | null;
  userAgent?: string | null;
}

// Webinar path (qualified RSVPs only; the caller applies that gate). Never throws.
export async function reportLeadToMeta(lead: QualifiedLead): Promise<void> {
  if (!isMetaCapiConfigured()) return;
  try {
    const email = normalize(lead.email);
    if (await alreadyReported(email)) {
      await markReported(email); // e.g. they already signed in; keep this RSVP row from being retried
      return;
    }
    const ok = await sendMetaLead({ eventId: personEventId(email), email, ip: lead.ip, userAgent: lead.userAgent });
    if (ok) await markReported(email);
  } catch (err) {
    console.error("reportLeadToMeta failed:", err instanceof Error ? err.message : "error");
  }
}

export interface VerifiedSignIn {
  userId: string;
  email: string;
  // Channel from ?ref= (meta / ig). Stored for reporting only; never sent to Meta.
  signupRef?: unknown;
  ip?: string | null;
  userAgent?: string | null;
}

// Sign-in path: call when a session is first confirmed through an emailed magic
// link. Records the sign-in and channel on the student row (reporting), then
// reports one Lead if this person has never been reported. No owner/qualification
// condition: ManyChat does the qualifying upstream. Never throws.
export async function reportFirstVerifiedSignIn(signIn: VerifiedSignIn): Promise<void> {
  const email = normalize(signIn.email);
  try {
    const admin = createAdminClient();
    const ref = sanitizeRef(signIn.signupRef);
    // First-write-wins, so a later sign-in never overwrites the original channel or time.
    const first = await admin
      .from("students")
      .update({ first_verified_at: new Date().toISOString() })
      .eq("id", signIn.userId)
      .is("first_verified_at", null);
    if (first.error) console.error("first_verified_at update failed:", first.error.message);
    if (ref) {
      const channel = await admin.from("students").update({ signup_ref: ref }).eq("id", signIn.userId).is("signup_ref", null);
      if (channel.error) console.error("signup_ref update failed:", channel.error.message);
    }
  } catch (err) {
    console.error("recording first verified sign-in failed:", err instanceof Error ? err.message : "error");
  }

  if (!isMetaCapiConfigured()) return;
  try {
    if (await alreadyReported(email)) return;
    const event = { eventId: personEventId(email), email, ip: signIn.ip, userAgent: signIn.userAgent };
    let ok = await sendMetaLead(event);
    if (!ok) {
      // One quick retry; anything still failing is picked up by retryUnsentMetaLeads.
      await new Promise((resolve) => setTimeout(resolve, QUICK_RETRY_DELAY_MS));
      ok = await sendMetaLead(event);
    }
    if (ok) await markReported(email);
  } catch (err) {
    console.error("reportFirstVerifiedSignIn failed:", err instanceof Error ? err.message : "error");
  }
}

export interface MetaRetryResult {
  skipped?: true;
  considered: number;
  sent: number;
  failed: number;
}

// Sends anyone from the last 3 days Meta hasn't confirmed: qualified webinar RSVPs
// and verified sign-ins. Throws on a database error so the caller can isolate it.
export async function retryUnsentMetaLeads(now: Date = new Date()): Promise<MetaRetryResult> {
  if (!isMetaCapiConfigured()) return { skipped: true, considered: 0, sent: 0, failed: 0 };

  const admin = createAdminClient();
  const since = new Date(now.getTime() - RETRY_WINDOW_MS).toISOString();

  const [leadRows, signInRows] = await Promise.all([
    admin
      .from("leads")
      .select("id, email, ip, user_agent, created_at")
      .is("meta_lead_sent_at", null)
      .eq("homeowner_status", "owner_central_ohio")
      .gte("created_at", since)
      .order("created_at", { ascending: true })
      .limit(RETRY_LIMIT),
    admin
      .from("students")
      .select("id, email, first_verified_at")
      .is("meta_lead_sent_at", null)
      .not("first_verified_at", "is", null)
      .gte("first_verified_at", since)
      .order("first_verified_at", { ascending: true })
      .limit(RETRY_LIMIT),
  ]);
  if (leadRows.error) throw leadRows.error;
  if (signInRows.error) throw signInRows.error;

  const candidates: Array<{ email: string; ip: string | null; userAgent: string | null; at: string }> = [
    ...(leadRows.data ?? []).map((l) => ({ email: l.email as string, ip: (l.ip as string | null) ?? null, userAgent: (l.user_agent as string | null) ?? null, at: l.created_at as string })),
    ...(signInRows.data ?? []).map((s) => ({ email: s.email as string, ip: null, userAgent: null, at: s.first_verified_at as string })),
  ];

  const seen = new Set<string>();
  let considered = 0;
  let sent = 0;
  let failed = 0;
  for (const candidate of candidates) {
    const email = normalize(candidate.email);
    if (seen.has(email)) continue; // same person on both lists
    seen.add(email);
    considered += 1;
    if (await alreadyReported(email)) {
      await markReported(email);
      continue;
    }
    const ok = await sendMetaLead({
      eventId: personEventId(email),
      email,
      ip: candidate.ip,
      userAgent: candidate.userAgent,
      eventTime: Math.floor(new Date(candidate.at).getTime() / 1000),
    });
    if (ok) {
      await markReported(email);
      sent += 1;
    } else {
      failed += 1;
    }
  }
  return { considered, sent, failed };
}
