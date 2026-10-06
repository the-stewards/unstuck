import { NextResponse } from "next/server";
import { sendDueReminders } from "@/lib/reminders";

// Run every ~5 minutes by whatever scheduler is configured (Vercel Cron on a
// plan that allows it, or an external caller). Same bearer-token auth as the
// other cron routes: nobody else can trigger sends. Idempotent, so extra or
// overlapping calls are harmless.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    return NextResponse.json(await sendDueReminders());
  } catch (err) {
    console.error("send-reminders failed:", err);
    return NextResponse.json({ error: "Reminder run failed." }, { status: 500 });
  }
}
