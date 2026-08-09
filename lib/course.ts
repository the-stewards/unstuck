import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Bonus, Module, Order, Resource, Student, StudentBonusStatus, Testimonial } from "@/lib/types";

export async function getStudentById(id: string): Promise<Student | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("students").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as Student | null;
}

export async function getModules(): Promise<Module[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("modules").select("*").order("display_order");
  if (error) throw error;
  return (data ?? []) as Module[];
}

export async function getModule(moduleId: string): Promise<Module | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("modules")
    .select("*")
    .eq("id", moduleId)
    .maybeSingle();
  if (error) throw error;
  return data as Module | null;
}

export async function getResourcesForModule(moduleId: string): Promise<Resource[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("resources")
    .select("*")
    .eq("module_id", moduleId)
    .order("display_order");
  if (error) throw error;
  return (data ?? []) as Resource[];
}

export async function getBonuses(): Promise<Bonus[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("bonuses").select("*").order("display_order");
  if (error) throw error;
  return (data ?? []) as Bonus[];
}

export async function getStudentBonusStatuses(email: string): Promise<StudentBonusStatus[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("student_bonus_status")
    .select("*")
    .eq("student_email", email.trim().toLowerCase());
  if (error) throw error;
  return (data ?? []) as StudentBonusStatus[];
}

export async function getActiveTestimonials(): Promise<Testimonial[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("testimonials")
    .select("*")
    .eq("active", true)
    .order("display_order");
  if (error) throw error;
  return (data ?? []) as Testimonial[];
}

// Reads orders by Stripe session id for the /purchase/success page. orders
// has no client-side RLS policy, so this must use the service-role client
// even though it's rendering a page a student is looking at.
export async function getOrderBySessionId(sessionId: string): Promise<Order | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("stripe_session_id", sessionId)
    .maybeSingle();
  if (error) throw error;
  return data as Order | null;
}
