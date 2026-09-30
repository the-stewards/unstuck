import { NextResponse } from "next/server";
import { getLeadForm } from "@/lib/lead-forms";
import { buildIcs } from "@/lib/lead-calendar";

// Opened as a plain link (download / "open with calendar app"), so it needs
// no CORS. The event recurs weekly; DTSTART is the next occurrence.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const form = getLeadForm(url.searchParams.get("form"));
  const inline = url.searchParams.get("inline") === "1";
  if (!form) return new NextResponse("Not found", { status: 404 });

  return new NextResponse(buildIcs(form), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="unstuck-${form.key}.ics"`,
      "Cache-Control": "public, max-age=300",
    },
  });
}
