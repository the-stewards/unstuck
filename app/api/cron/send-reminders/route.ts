import { NextResponse } from "next/server";
import { sendDueReminders } from "@/lib/reminders";
import { retryUnsentMetaLeads } from "@/lib/meta-lead";

// Run every ~5 minutes by whatever scheduler is configured (Vercel Cron on a
// plan that allows it, or an external caller). Same bearer-token auth as the
// other cron routes: nobody else can trigger sends. Idempotent, so extra or
// overlapping calls are harmless.
//
// Also retries any qualified RSVP whose Meta Lead wasn't confirmed. That retry is
// isolated: if it fails, the reminders result still goes out unchanged.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const reminders = await sendDueReminders();
    let metaLeads: Awaited<ReturnType<typeof retryUnsentMetaLeads>> | { error: string };
    try {
      metaLeads = await retryUnsentMetaLeads();
    } catch (err) {
      console.error("meta lead retry failed:", err instanceof Error ? err.message : "error");
      metaLeads = { error: "retry failed" };
    }
    return NextResponse.json({ ...reminders, metaLeads });
  } catch (err) {
    console.error("send-reminders failed:", err);
    return NextResponse.json({ error: "Reminder run failed." }, { status: 500 });
  }
}
