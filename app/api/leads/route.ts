import { NextResponse } from "next/server";
import { getLeadForm } from "@/lib/lead-forms";
import { submitLead } from "@/lib/leads";
import { sendLeadConfirmationEmail } from "@/lib/notify";
import { LEAD_CORS_HEADERS } from "@/lib/lead-cors";

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

    // The lead is already saved; a failed confirmation email must never turn
    // this into an error response (a retry would just hit the 409).
    const form = getLeadForm(result.formKey);
    if (form) {
      try {
        await sendLeadConfirmationEmail(result.email, result.firstName, form.eventName, form.eventDate);
      } catch (err) {
        console.error("Lead confirmation email failed:", err);
      }
    }

    return json({ ok: true });
  } catch (err) {
    console.error("POST /api/leads failed:", err);
    return json({ error: "Something went wrong. Try again." }, 500);
  }
}
