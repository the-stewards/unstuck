import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Bonus, Module, Resource, Student, Testimonial } from "@/lib/types";

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

export interface ModuleWithResources extends Module {
  resources: Resource[];
}

// Admin content editing needs every module/resource/bonus/testimonial
// regardless of whether the admin's own account has an access_grants row —
// the RLS-gated reads in lib/course.ts require has_access() and would
// wrongly hide content from an admin who isn't also a paying student.
export async function listModulesWithResources(): Promise<ModuleWithResources[]> {
  const supabase = createAdminClient();

  const [
    { data: modules, error: modulesError },
    { data: resources, error: resourcesError },
  ] = await Promise.all([
    supabase.from("modules").select("*").order("display_order"),
    supabase.from("resources").select("*").order("display_order"),
  ]);

  if (modulesError) throw modulesError;
  if (resourcesError) throw resourcesError;

  const resourcesByModule = new Map<string, Resource[]>();
  for (const resource of (resources ?? []) as Resource[]) {
    const list = resourcesByModule.get(resource.module_id) ?? [];
    list.push(resource);
    resourcesByModule.set(resource.module_id, list);
  }

  return ((modules ?? []) as Module[]).map((courseModule) => ({
    ...courseModule,
    resources: resourcesByModule.get(courseModule.id) ?? [],
  }));
}

export async function listAllBonuses(): Promise<Bonus[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("bonuses").select("*").order("display_order");
  if (error) throw error;
  return (data ?? []) as Bonus[];
}

export async function listAllTestimonials(): Promise<Testimonial[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("testimonials").select("*").order("display_order");
  if (error) throw error;
  return (data ?? []) as Testimonial[];
}
