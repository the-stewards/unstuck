import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { ProgressStatus } from "@/lib/types";

// v1 completion heuristic (spec's "Option B"): a module counts as watched
// once tracked active time reaches this fraction of its known duration. No
// confirmed Dubb completion-event API exists yet — see build-plan-lms.md.
const COMPLETE_THRESHOLD = 0.95;

export function computeStatus(
  watchPositionSeconds: number,
  durationSeconds: number
): ProgressStatus {
  if (watchPositionSeconds <= 0) return "not_started";
  if (durationSeconds > 0 && watchPositionSeconds >= durationSeconds * COMPLETE_THRESHOLD) {
    return "complete";
  }
  return "in_progress";
}

export async function upsertProgress(
  studentId: string,
  moduleId: string,
  watchPositionSeconds: number,
  durationSeconds: number
) {
  const supabase = await createClient();

  const { data: existingRow, error: selectError } = await supabase
    .from("progress")
    .select("watch_position_seconds, status, completed_at")
    .eq("student_id", studentId)
    .eq("module_id", moduleId)
    .maybeSingle();

  if (selectError) throw selectError;

  const existing = existingRow as {
    watch_position_seconds: number;
    status: ProgressStatus;
    completed_at: string | null;
  } | null;

  // Never let tracked position move backward — re-opening a module already
  // watched shouldn't reset progress.
  const nextPosition = Math.max(existing?.watch_position_seconds ?? 0, watchPositionSeconds);
  const nextStatus = computeStatus(nextPosition, durationSeconds);
  const completedAt =
    nextStatus === "complete" ? existing?.completed_at ?? new Date().toISOString() : null;

  const { error: upsertError } = await supabase.from("progress").upsert(
    {
      student_id: studentId,
      module_id: moduleId,
      watch_position_seconds: nextPosition,
      status: nextStatus,
      completed_at: completedAt,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "student_id,module_id" }
  );

  if (upsertError) throw upsertError;

  return { status: nextStatus, watchPositionSeconds: nextPosition };
}

export async function getProgressMap(studentId: string): Promise<Map<string, ProgressStatus>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("progress")
    .select("module_id, status")
    .eq("student_id", studentId);

  if (error) throw error;

  const rows = (data ?? []) as { module_id: string; status: ProgressStatus }[];
  return new Map(rows.map((row) => [row.module_id, row.status]));
}

export async function getModuleProgress(
  studentId: string,
  moduleId: string
): Promise<{ status: ProgressStatus; watchPositionSeconds: number } | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("progress")
    .select("status, watch_position_seconds")
    .eq("student_id", studentId)
    .eq("module_id", moduleId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const row = data as { status: ProgressStatus; watch_position_seconds: number };
  return { status: row.status, watchPositionSeconds: row.watch_position_seconds };
}

export async function getCourseProgress(studentId: string) {
  const supabase = await createClient();

  const [{ data: modules, error: modulesError }, { data: progressRows, error: progressError }] =
    await Promise.all([
      supabase.from("modules").select("id").order("display_order"),
      supabase.from("progress").select("module_id, status").eq("student_id", studentId),
    ]);

  if (modulesError) throw modulesError;
  if (progressError) throw progressError;

  const rows = (progressRows ?? []) as { status: ProgressStatus }[];
  const total = modules?.length ?? 0;
  const completed = rows.filter((p) => p.status === "complete").length;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

  return { total, completed, percent };
}
