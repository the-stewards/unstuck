import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Student } from "@/lib/types";

export interface StudentWithProgress extends Student {
  completedModules: number;
  totalModules: number;
}

// Admin-only read — students/progress RLS only lets a user see their own
// row, so listing every student for the /admin table has to go through the
// service-role client. Callers must gate on requireAdmin() first.
export async function listStudentsWithProgress(): Promise<StudentWithProgress[]> {
  const supabase = createAdminClient();

  const [
    { data: students, error: studentsError },
    { data: modules, error: modulesError },
    { data: progressRows, error: progressError },
  ] = await Promise.all([
    supabase.from("students").select("*").order("created_at", { ascending: false }),
    supabase.from("modules").select("id"),
    supabase.from("progress").select("student_id").eq("status", "complete"),
  ]);

  if (studentsError) throw studentsError;
  if (modulesError) throw modulesError;
  if (progressError) throw progressError;

  const totalModules = (modules ?? []).length;
  const completedByStudent = new Map<string, number>();
  for (const row of (progressRows ?? []) as { student_id: string }[]) {
    completedByStudent.set(row.student_id, (completedByStudent.get(row.student_id) ?? 0) + 1);
  }

  return ((students ?? []) as Student[]).map((student) => ({
    ...student,
    completedModules: completedByStudent.get(student.id) ?? 0,
    totalModules,
  }));
}
