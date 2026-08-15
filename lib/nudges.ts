import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export interface StalledStudent {
  id: string;
  email: string;
}

const STALL_AFTER_DAYS = 5;
const NUDGE_COOLDOWN_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

// A student counts as "stalled" if they've started (at least one progress
// row), haven't finished every published module, and haven't touched
// anything in STALL_AFTER_DAYS. NUDGE_COOLDOWN_DAYS then gates repeat sends
// so a daily cron doesn't re-email the same still-stalled student every run.
export async function getStalledStudents(now: Date = new Date()): Promise<StalledStudent[]> {
  const supabase = createAdminClient();

  const [
    { data: modules, error: modulesError },
    { data: progressRows, error: progressError },
    { data: students, error: studentsError },
  ] = await Promise.all([
    supabase.from("modules").select("id").eq("status", "published"),
    supabase.from("progress").select("student_id, status, updated_at"),
    supabase.from("students").select("id, email, last_nudged_at"),
  ]);

  if (modulesError) throw modulesError;
  if (progressError) throw progressError;
  if (studentsError) throw studentsError;

  const totalModules = (modules ?? []).length;
  if (totalModules === 0) return [];

  const rows = (progressRows ?? []) as { student_id: string; status: string; updated_at: string }[];

  const activityByStudent = new Map<string, { completed: number; lastActivity: Date }>();
  for (const row of rows) {
    const entry = activityByStudent.get(row.student_id) ?? { completed: 0, lastActivity: new Date(0) };
    if (row.status === "complete") entry.completed += 1;
    const updatedAt = new Date(row.updated_at);
    if (updatedAt > entry.lastActivity) entry.lastActivity = updatedAt;
    activityByStudent.set(row.student_id, entry);
  }

  const stallCutoff = new Date(now.getTime() - STALL_AFTER_DAYS * DAY_MS);
  const cooldownCutoff = new Date(now.getTime() - NUDGE_COOLDOWN_DAYS * DAY_MS);

  const studentRows = (students ?? []) as {
    id: string;
    email: string;
    last_nudged_at: string | null;
  }[];

  return studentRows
    .filter((student) => {
      const activity = activityByStudent.get(student.id);
      if (!activity) return false; // never started — different lifecycle, not this nudge
      if (activity.completed >= totalModules) return false; // finished
      if (activity.lastActivity > stallCutoff) return false; // recently active
      if (student.last_nudged_at && new Date(student.last_nudged_at) > cooldownCutoff) return false;
      return true;
    })
    .map((student) => ({ id: student.id, email: student.email }));
}
