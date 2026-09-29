import { NextResponse } from "next/server";
import { LEAD_WIDGET_JS } from "@/lib/lead-widget-source";

// Script-tag embed for the lead form. See lib/lead-widget-source.ts for why
// it's a <script src> and how it's configured (data-* attributes).
export async function GET() {
  return new NextResponse(LEAD_WIDGET_JS, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      // Short cache: the widget is small and copy/behavior changes should
      // reach embeds within minutes, not days.
      "Cache-Control": "public, max-age=300, s-maxage=300",
    },
  });
}
