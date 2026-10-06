import "server-only";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { HOMEOWNER_STATUSES, getLeadForm } from "@/lib/lead-forms";
import { nextSessionAt } from "@/lib/lead-calendar";

const leadSchema = z.object({
  form: z.string(),
  firstName: z.string().trim().min(1, "First name is required.").max(80),
  lastName: z.string().trim().min(1, "Last name is required.").max(80),
  email: z.string().trim().max(254).pipe(z.email("Please enter a valid email address.")),
  phone: z
    .string()
    .trim()
    .max(40)
    .refine((v) => v.replace(/\D/g, "").length >= 10, "Please enter a valid phone number."),
  smsConsent: z.literal(true, { error: "Please check the box to consent to texts." }),
  // Optional on the wire so a widget script cached from before this question
  // existed can still register people; the current widget always sends it (the
  // radio group is required). A value that IS sent must be one of ours.
  homeowner_status: z.enum(HOMEOWNER_STATUSES, { error: "Please tell us whether you own your home in Central Ohio." }).optional(),
  // The exact wording the visitor was shown. Must match the server's current
  // wording, so the stored consent record can never differ from what they saw.
  consentText: z.string().optional(),
  // Attribution string (utm_*), truncated rather than rejected: a long
  // campaign name must never cost us an RSVP.
  ref: z
    .string()
    .trim()
    .transform((v) => v.slice(0, 100))
    .optional(),
});

export type SubmitLeadResult =
  | {
      ok: true;
      leadId: string | null;
      email: string;
      firstName: string;
      formKey: string;
      // True when this email already had an RSVP for the same session: the
      // visitor just continues the flow, and no second email/Zap delivery is sent.
      duplicate?: boolean;
    }
  | { ok: false; status: 400 | 404 | 409 | 429 | 500; error: string };

// Per IP per hour. Generous so a group on shared venue/office wifi is fine,
// tight enough to stop a scripted flood.
const RATE_LIMIT_MAX = 60;
const RATE_LIMIT_WINDOW_SECONDS = 60 * 60;

async function isRateLimited(ip: string): Promise<boolean> {
  // No trustworthy client IP (local dev, non-Vercel host): a shared "unknown"
  // bucket would lock every visitor out after 60 fills, so skip the limit.
  if (ip === "unknown") return false;
  try {
    const { data, error } = await createAdminClient().rpc("hit_rate_limit", {
      p_key: `lead:${ip}`,
      p_max: RATE_LIMIT_MAX,
      p_window_seconds: RATE_LIMIT_WINDOW_SECONDS,
    });
    if (error) throw error;
    return data === true;
  } catch (err) {
    // Fail open: a rate-limit outage must not take the form down.
    console.error("hit_rate_limit failed:", err);
    return false;
  }
}

export interface SubmitLeadContext {
  ip: string;
  userAgent: string;
}

// body is untrusted JSON. Honeypot handling lives in the route (needs to fake
// success without touching the DB).
export async function submitLead(body: unknown, ctx: SubmitLeadContext): Promise<SubmitLeadResult> {
  const raw = (body ?? {}) as Record<string, unknown>;
  const formConfig = getLeadForm(raw.form);
  if (!formConfig) {
    return { ok: false, status: 404, error: "This form isn't available." };
  }

  const parsed = leadSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, status: 400, error: parsed.error.issues[0]?.message ?? "Invalid submission." };
  }
  const lead = parsed.data;

  // Cached form meta / long-open pages can show old consent wording after an
  // edit. Refuse rather than record wording the visitor never saw.
  if (lead.consentText !== formConfig.consentText) {
    return { ok: false, status: 409, error: "This form was just updated. Please refresh the page and try again." };
  }

  if (await isRateLimited(ctx.ip)) {
    return { ok: false, status: 429, error: "Too many submissions from this connection. Try again later." };
  }

  const sessionAt = nextSessionAt(formConfig.schedule).toISOString();

  const { data, error } = await createAdminClient().rpc("submit_lead", {
    p_form_key: formConfig.key,
    p_first_name: lead.firstName,
    p_last_name: lead.lastName,
    p_email: lead.email,
    p_phone: lead.phone,
    p_sms_consent: true,
    p_consent_text: formConfig.consentText,
    p_ip: ctx.ip,
    p_user_agent: ctx.userAgent.slice(0, 300),
    p_ref: lead.ref || null,
    p_homeowner_status: lead.homeowner_status ?? null,
    p_session_at: sessionAt,
  });

  if (error) {
    if (error.code === "23505") {
      // Same person, same session: treat as success so they can carry on to the
      // next step (offer / calendar) instead of dead-ending on an error.
      const existing = await findExistingLead(formConfig.key, lead.email, sessionAt);
      if (existing) {
        return {
          ok: true,
          leadId: existing,
          email: lead.email.toLowerCase(),
          firstName: lead.firstName,
          formKey: formConfig.key,
          duplicate: true,
        };
      }
      return { ok: false, status: 409, error: "This email has already reserved a seat." };
    }
    console.error("submit_lead failed:", error);
    return { ok: false, status: 500, error: "Something went wrong. Try again." };
  }

  return {
    ok: true,
    leadId: typeof data === "string" ? data : null,
    email: lead.email.toLowerCase(),
    firstName: lead.firstName,
    formKey: formConfig.key,
  };
}

async function findExistingLead(formKey: string, email: string, sessionAt: string): Promise<string | null> {
  try {
    const { data } = await createAdminClient()
      .from("leads")
      .select("id")
      .eq("form_key", formKey)
      .eq("email", email.trim().toLowerCase())
      .eq("session_at", sessionAt)
      .maybeSingle();
    return typeof data?.id === "string" ? data.id : null;
  } catch {
    return null;
  }
}

// Server-side truth, one exact count per form. No counter row to drift.
export async function getLeadCount(formKey: string): Promise<number> {
  const { count, error } = await createAdminClient()
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("form_key", formKey);
  if (error) throw error;
  return count ?? 0;
}
