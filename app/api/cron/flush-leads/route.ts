import { NextResponse } from "next/server";
import { flushLeadOutbox } from "@/lib/lead-outbox";

// Daily safety net (see vercel.json): retries any lead_outbox rows that
// weren't delivered to Zapier at submit time. Same auth as the nudge cron -
// Vercel attaches `Authorization: Bearer $CRON_SECRET` to cron requests when
// the env var is set, and this stops anyone else from triggering a flush.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await flushLeadOutbox({ limit: 50 });
  return NextResponse.json(result);
}
