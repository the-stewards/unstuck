import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStalledStudents } from "@/lib/nudges";
import { sendStalledNudgeEmail, sendAdminAlert } from "@/lib/notify";

// Triggered daily by Vercel Cron (see vercel.json). Vercel automatically
// attaches `Authorization: Bearer $CRON_SECRET` to cron-triggered requests
// when that env var is set — checking it here is what stops this route from
// being callable (and mass-emailing students) by anyone who finds the URL.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const students = await getStalledStudents();
  const supabase = createAdminClient();

  let sent = 0;
  const failures: string[] = [];

  for (const student of students) {
    try {
      await sendStalledNudgeEmail(student.email);

      const { error } = await supabase
        .from("students")
        .update({ last_nudged_at: new Date().toISOString() })
        .eq("id", student.id);
      if (error) throw error;

      sent += 1;
    } catch (err) {
      // One failed send shouldn't stop the rest of the batch from going out.
      failures.push(`${student.email}: ${(err as Error).message}`);
    }
  }

  if (failures.length > 0) {
    await sendAdminAlert(
      "Stalled-student nudge: some sends failed",
      failures.map((line) => `<p>${line}</p>`).join("")
    );
  }

  return NextResponse.json({ candidates: students.length, sent, failed: failures.length });
}
