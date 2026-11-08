import "server-only";
import { createHash } from "node:crypto";

// Meta Conversions API sender for the UNSTUCK dataset. Lead events only.
//
// Housing "core setup" restrictions apply to this dataset, so an event carries
// NO custom_data (no value, currency, content or loan details) and its source
// URL is the bare origin: never a path, query string or ?ref= attribution (that
// stays in our own database). Personal data is limited to the hashed email and
// the technical request fields (IP, user agent).
//
// Nothing here may ever break an RSVP: every failure path returns false.

const GRAPH_VERSION = process.env.META_GRAPH_VERSION || "v26.0";
const TIMEOUT_MS = 5000;
const DEFAULT_ORIGIN = "https://unstuck.stewards.loan";

export interface MetaLeadInput {
  // Stable per lead (the lead id) so a retry can never double count, and so it
  // de-duplicates against the browser pixel's Lead, which uses the same id.
  eventId: string;
  email: string;
  ip?: string | null;
  userAgent?: string | null;
  // Unix seconds. Defaults to now; a retry passes the lead's original time.
  eventTime?: number;
}

export function isMetaCapiConfigured(): boolean {
  return Boolean(process.env.META_DATASET_ID && process.env.META_CAPI_TOKEN);
}

export function hashEmail(email: string): string {
  return createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
}

// One stable id per PERSON (not per RSVP or sign-in), so the webinar path and the
// sign-in path produce the same event_id for the same email and Meta counts it
// once even if both ever send. Derived from the hashed email, so it adds nothing
// beyond what the event already carries.
export function personEventId(email: string): string {
  return "lead_" + hashEmail(email).slice(0, 32);
}

function sourceUrl(): string {
  try {
    return new URL(process.env.NEXT_PUBLIC_APP_URL || DEFAULT_ORIGIN).origin;
  } catch {
    return DEFAULT_ORIGIN;
  }
}

export function buildLeadEvent(input: MetaLeadInput) {
  const userData: Record<string, string> = { em: hashEmail(input.email) };
  // "unknown" is our placeholder when no trustworthy client IP was available.
  if (input.ip && input.ip !== "unknown") userData.client_ip_address = input.ip;
  if (input.userAgent) userData.client_user_agent = input.userAgent;

  return {
    event_name: "Lead",
    event_time: input.eventTime ?? Math.floor(Date.now() / 1000),
    event_id: input.eventId,
    action_source: "website",
    event_source_url: sourceUrl(),
    user_data: userData,
  };
}

// True only when Meta confirms it received the event. Never throws, and never
// logs the token, the email, or the request URL.
export async function sendMetaLead(input: MetaLeadInput): Promise<boolean> {
  const datasetId = process.env.META_DATASET_ID;
  const token = process.env.META_CAPI_TOKEN;
  if (!datasetId || !token) return false;

  const body: Record<string, unknown> = {
    data: [buildLeadEvent(input)],
    // In the body (documented), not the URL, so it can't end up in a request log.
    access_token: token,
  };
  if (process.env.META_TEST_EVENT_CODE) body.test_event_code = process.env.META_TEST_EVENT_CODE;

  try {
    const response = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${datasetId}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const result = (await response.json().catch(() => ({}))) as {
      events_received?: number;
      error?: { message?: string; code?: number; type?: string };
    };
    if (!response.ok || result.events_received !== 1) {
      console.error("Meta CAPI Lead rejected:", {
        status: response.status,
        code: result.error?.code,
        type: result.error?.type,
        message: result.error?.message,
        events_received: result.events_received,
      });
      return false;
    }
    return true;
  } catch (err) {
    console.error("Meta CAPI Lead failed:", err instanceof Error ? err.name : "error");
    return false;
  }
}
