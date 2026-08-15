import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { ProgressStatus } from "@/lib/types";

// Completion is explicit (student clicks "Mark Complete"), not inferred from
// watch time — Dubb exposes no postMessage/JS completion-event API, and a
// duration-threshold heuristic silently broke for any module missing a
// duration_seconds value. Passive tracking still records in_progress so the
// dashboard can show partial engagement.
export function computeStatus(watchPositionSeconds: number): ProgressStatus {
  return watchPositionSeconds > 0 ? "in_progress" : "not_started";
}

export async function upsertProgress(
  studentId: string,
  moduleId: string,
  watchPositionSeconds: number
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
  // watched shouldn't reset progress. An explicit completion also never
  // regresses to in_progress just because the passive tracker ticked again.
  const nextPosition = Math.max(existing?.watch_position_seconds ?? 0, watchPositionSeconds);
  const nextStatus = existing?.status === "complete" ? "complete" : computeStatus(nextPosition);
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

export async function completeProgress(studentId: string, moduleId: string) {
  const supabase = await createClient();

  const { data: existingRow, error: selectError } = await supabase
    .from("progress")
    .select("watch_position_seconds, completed_at")
    .eq("student_id", studentId)
    .eq("module_id", moduleId)
    .maybeSingle();

  if (selectError) throw selectError;

  const existing = existingRow as {
    watch_position_seconds: number;
    completed_at: string | null;
  } | null;

  const { error: upsertError } = await supabase.from("progress").upsert(
    {
      student_id: studentId,
      module_id: moduleId,
      watch_position_seconds: existing?.watch_position_seconds ?? 0,
      status: "complete",
      completed_at: existing?.completed_at ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "student_id,module_id" }
  );

  if (upsertError) throw upsertError;

  return { status: "complete" as const };
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
      supabase.from("modules").select("id").eq("status", "published").order("display_order"),
      supabase.from("progress").select("module_id, status").eq("student_id", studentId),
    ]);

  if (modulesError) throw modulesError;
  if (progressError) throw progressError;

  const publishedIds = new Set((modules ?? []).map((m) => (m as { id: string }).id));
  const rows = (progressRows ?? []) as { module_id: string; status: ProgressStatus }[];
  const total = publishedIds.size;
  const completed = rows.filter((p) => p.status === "complete" && publishedIds.has(p.module_id)).length;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

  return { total, completed, percent };
}
