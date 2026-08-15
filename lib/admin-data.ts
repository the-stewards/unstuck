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
    supabase.from("modules").select("id").eq("status", "published"),
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

export interface AdminStats {
  totalGranted: number;
  totalPurchased: number;
  totalComped: number;
  startedCount: number;
  completedCount: number;
  revenueAllTimeCents: number;
  revenueThisMonthCents: number;
}

// One-shot read for the /admin stats block — computed in JS from rows we
// already fetch elsewhere rather than adding SQL aggregates, since the
// expected scale here (~1000 students) makes that unnecessary.
export async function getAdminStats(): Promise<AdminStats> {
  const supabase = createAdminClient();

  const [
    { data: grants, error: grantsError },
    { data: modules, error: modulesError },
    { data: progressRows, error: progressError },
    { data: orders, error: ordersError },
  ] = await Promise.all([
    supabase.from("access_grants").select("source"),
    supabase.from("modules").select("id").eq("status", "published"),
    supabase.from("progress").select("student_id, status"),
    supabase.from("orders").select("amount_cents, created_at"),
  ]);

  if (grantsError) throw grantsError;
  if (modulesError) throw modulesError;
  if (progressError) throw progressError;
  if (ordersError) throw ordersError;

  const grantRows = (grants ?? []) as { source: string }[];
  const totalGranted = grantRows.length;
  const totalPurchased = grantRows.filter((g) => g.source === "stripe_purchase").length;
  const totalComped = grantRows.filter((g) => g.source === "manual_comp").length;

  const totalModules = (modules ?? []).length;
  const completedByStudent = new Map<string, number>();
  const startedStudents = new Set<string>();
  for (const row of (progressRows ?? []) as { student_id: string; status: string }[]) {
    if (row.status !== "not_started") startedStudents.add(row.student_id);
    if (row.status === "complete") {
      completedByStudent.set(row.student_id, (completedByStudent.get(row.student_id) ?? 0) + 1);
    }
  }
  const completedCount =
    totalModules > 0
      ? [...completedByStudent.values()].filter((count) => count >= totalModules).length
      : 0;

  const orderRows = (orders ?? []) as { amount_cents: number; created_at: string }[];
  const revenueAllTimeCents = orderRows.reduce((sum, order) => sum + order.amount_cents, 0);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const revenueThisMonthCents = orderRows
    .filter((order) => new Date(order.created_at) >= monthStart)
    .reduce((sum, order) => sum + order.amount_cents, 0);

  return {
    totalGranted,
    totalPurchased,
    totalComped,
    startedCount: startedStudents.size,
    completedCount,
    revenueAllTimeCents,
    revenueThisMonthCents,
  };
}

export interface AbandonedCheckout {
  email: string;
  createdAt: string;
}

const ABANDONED_AFTER_MINUTES = 30;

// checkout_attempts is populated by /api/stripe/checkout on every session
// created (see supabase/migrations/0003_checkout_attempts.sql). "Abandoned"
// = an attempt whose email never shows up in access_grants, older than the
// grace window so someone mid-payment right now doesn't show up as
// abandoned. Fails soft (empty list) rather than throwing, since this table
// won't exist until that migration is applied — Claude can't run Supabase
// migrations directly (see handoff/final-report-lms.md), so there's a real
// window where the admin page is live before the table is.
export async function getAbandonedCheckouts(): Promise<AbandonedCheckout[]> {
  const supabase = createAdminClient();

  const [{ data: attempts, error: attemptsError }, { data: grants, error: grantsError }] =
    await Promise.all([
      supabase
        .from("checkout_attempts")
        .select("email, created_at")
        .order("created_at", { ascending: false }),
      supabase.from("access_grants").select("email"),
    ]);

  if (attemptsError || grantsError) return [];

  const grantedEmails = new Set(
    ((grants ?? []) as { email: string }[]).map((g) => g.email.toLowerCase())
  );
  const cutoff = Date.now() - ABANDONED_AFTER_MINUTES * 60 * 1000;

  const seen = new Set<string>();
  const abandoned: AbandonedCheckout[] = [];
  for (const row of (attempts ?? []) as { email: string; created_at: string }[]) {
    const email = row.email.toLowerCase();
    if (grantedEmails.has(email)) continue;
    if (new Date(row.created_at).getTime() > cutoff) continue;
    if (seen.has(email)) continue; // one row per email, most recent attempt
    seen.add(email);
    abandoned.push({ email: row.email, createdAt: row.created_at });
  }

  return abandoned;
}
