import { NextResponse } from "next/server";
import { getCalendarPageUrl, getLeadForm } from "@/lib/lead-forms";
import { getLeadCount } from "@/lib/leads";
import { LEAD_CORS_HEADERS } from "@/lib/lead-cors";
import { googleCalendarUrl, nextSessionLabel } from "@/lib/lead-calendar";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: LEAD_CORS_HEADERS });
}

// Public form metadata + fill count. The widget calls this once on load: it
// needs the copy/consent wording (server is the source of truth for both) and
// the counter number. Count failures degrade to 0 so the form itself still
// renders (the counter is hidden below the threshold anyway).
export async function GET(request: Request) {
  const formKey = new URL(request.url).searchParams.get("form");
  const form = getLeadForm(formKey);
  if (!form) {
    return NextResponse.json({ error: "This form isn't available." }, { status: 404, headers: LEAD_CORS_HEADERS });
  }

  let count = 0;
  try {
    count = await getLeadCount(form.key);
  } catch (err) {
    console.error("getLeadCount failed:", err);
  }

  return NextResponse.json(
    {
      count,
      minCount: form.minCount,
      nextSession: nextSessionLabel(form.schedule),
      form: {
        key: form.key,
        title: form.title,
        subtitle: form.subtitle,
        cta: form.cta,
        countLabel: form.countLabel,
        consentText: form.consentText,
        successTitle: form.successTitle,
        successMessage: form.successMessage,
        upsell: form.upsell ?? null,
        calendarStep: form.calendarStep,
        calendarPageUrl: getCalendarPageUrl(form, new URL(request.url).origin),
        calendar: {
          google: googleCalendarUrl(form),
          ics: `${new URL(request.url).origin}/api/leads/calendar?form=${form.key}`,
        },
      },
    },
    {
      headers: {
        ...LEAD_CORS_HEADERS,
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120",
      },
    }
  );
}
