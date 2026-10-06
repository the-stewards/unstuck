import { NextResponse } from "next/server";
import { getLeadForm } from "@/lib/lead-forms";
import { submitLead } from "@/lib/leads";
import { sendLeadConfirmationEmail } from "@/lib/notify";
import { LEAD_CORS_HEADERS } from "@/lib/lead-cors";
import { flushLeadOutbox } from "@/lib/lead-outbox";
import { googleCalendarUrl, nextSessionLabel } from "@/lib/lead-calendar";

const MAX_BODY_BYTES = 10_000;

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: LEAD_CORS_HEADERS });
}

// Every response is JSON with CORS headers - the widget always calls
// response.json(), so an exception must never fall through to Next's HTML
// error page (same contract as the checkout route).
function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: LEAD_CORS_HEADERS });
}

export async function POST(request: Request) {
  try {
    const text = await request.text();
    if (text.length > MAX_BODY_BYTES) return json({ error: "Request too large." }, 413);

    let body: Record<string, unknown> | null = null;
    try {
      const parsed = JSON.parse(text);
      body = parsed && typeof parsed === "object" ? parsed : null;
    } catch {
      body = null;
    }
    if (!body) return json({ error: "Invalid request." }, 400);

    // Honeypot: bots fill every field. Pretend success so they don't adapt.
    if (typeof body.website === "string" && body.website.trim() !== "") {
      return json({ ok: true });
    }

    const ip =
      request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";
    const userAgent = request.headers.get("user-agent") ?? "";

    const result = await submitLead(body, { ip, userAgent });
    if (!result.ok) return json({ error: result.error }, result.status);

    // Same person, same session: they already got their email and Zap delivery.
    if (result.duplicate) return json({ ok: true, leadId: result.leadId });

    // The lead is already saved; neither the confirmation email nor the
    // Zapier delivery may turn this into an error response (a retry would just
    // hit the 409). They run together so they add one round trip, not two.
    // Undelivered outbox rows are retried by the next submission's flush and
    // the daily cron.
    const form = getLeadForm(result.formKey);
    await Promise.allSettled([
      form
        ? sendLeadConfirmationEmail(
            result.email,
            result.firstName,
            form.eventName,
            nextSessionLabel(form.schedule),
            {
              google: googleCalendarUrl(form),
              ics: `${process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin}/api/leads/calendar?form=${form.key}`,
            },
            form.calendar.joinUrl
              ? { url: form.calendar.joinUrl, label: form.calendar.joinLabel ?? "Join the session", note: form.calendar.joinNote }
              : undefined
          ).catch((err) => console.error("Lead confirmation email failed:", err))
        : Promise.resolve(),
      result.leadId ? flushLeadOutbox({ leadId: result.leadId }) : Promise.resolve(),
      flushLeadOutbox({ limit: 5 }),
    ]);

    // leadId is the visitor's own opaque id; the step 2 page uses it (instead
    // of name/email in the URL) to start checkout for this RSVP.
    return json({ ok: true, leadId: result.leadId });
  } catch (err) {
    console.error("POST /api/leads failed:", err);
    return json({ error: "Something went wrong. Try again." }, 500);
  }
}
