"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { runAdminAction, type ActionResult } from "@/lib/action-result";
import { assertSafeDubbEmbed } from "@/lib/dubb-embed";
import type { ResourceType } from "@/lib/types";

interface ModuleInput {
  id?: string;
  title: string;
  description: string;
  dubb_url: string;
  duration_seconds: number;
  display_order: number;
}

// The embed field is rendered with dangerouslySetInnerHTML on the student
// side (see components/DubbEmbed.tsx) — safe only because writes are
// admin-gated. This allowlist is a second layer: even a compromised admin
// session can only ever save a plain Dubb iframe, not arbitrary HTML/script.
export async function upsertModule(input: ModuleInput): Promise<ActionResult> {
  return runAdminAction(async () => {
    assertSafeDubbEmbed(input.dubb_url);
    const supabase = createAdminClient();
    const { id, ...fields } = input;

    const { error } = id
      ? await supabase.from("modules").update(fields).eq("id", id)
      : await supabase.from("modules").insert(fields);

    if (error) throw error;
    revalidatePath("/admin/modules");
  });
}

export async function deleteModule(id: string): Promise<ActionResult> {
  return runAdminAction(async () => {
    const supabase = createAdminClient();
    const { error } = await supabase.from("modules").delete().eq("id", id);
    if (error) throw error;
    revalidatePath("/admin/modules");
  });
}

interface ResourceInput {
  id?: string;
  module_id: string;
  title: string;
  type: ResourceType;
  file_url: string;
  display_order: number;
}

export async function upsertResource(input: ResourceInput): Promise<ActionResult> {
  return runAdminAction(async () => {
    const supabase = createAdminClient();
    const { id, ...fields } = input;

    const { error } = id
      ? await supabase.from("resources").update(fields).eq("id", id)
      : await supabase.from("resources").insert(fields);

    if (error) throw error;
    revalidatePath("/admin/modules");
  });
}

export async function deleteResource(id: string): Promise<ActionResult> {
  return runAdminAction(async () => {
    const supabase = createAdminClient();
    const { error } = await supabase.from("resources").delete().eq("id", id);
    if (error) throw error;
    revalidatePath("/admin/modules");
  });
}

interface BonusInput {
  id?: string;
  title: string;
  description: string;
  value_prop: string;
  content_url: string;
  display_order: number;
}

export async function upsertBonus(input: BonusInput): Promise<ActionResult> {
  return runAdminAction(async () => {
    const supabase = createAdminClient();
    const { id, ...fields } = input;

    const { error } = id
      ? await supabase.from("bonuses").update(fields).eq("id", id)
      : await supabase.from("bonuses").insert(fields);

    if (error) throw error;
    revalidatePath("/admin/bonuses");
  });
}

export async function deleteBonus(id: string): Promise<ActionResult> {
  return runAdminAction(async () => {
    const supabase = createAdminClient();
    const { error } = await supabase.from("bonuses").delete().eq("id", id);
    if (error) throw error;
    revalidatePath("/admin/bonuses");
  });
}

interface TestimonialInput {
  id?: string;
  client_name: string;
  quote: string;
  result_stat: string;
  photo_url: string;
  display_order: number;
  active: boolean;
}

export async function upsertTestimonial(input: TestimonialInput): Promise<ActionResult> {
  return runAdminAction(async () => {
    const supabase = createAdminClient();
    const { id, ...fields } = input;

    const { error } = id
      ? await supabase.from("testimonials").update(fields).eq("id", id)
      : await supabase.from("testimonials").insert(fields);

    if (error) throw error;
    revalidatePath("/admin/testimonials");
  });
}

export async function deleteTestimonial(id: string): Promise<ActionResult> {
  return runAdminAction(async () => {
    const supabase = createAdminClient();
    const { error } = await supabase.from("testimonials").delete().eq("id", id);
    if (error) throw error;
    revalidatePath("/admin/testimonials");
  });
}

type OrderedTable = "modules" | "resources" | "bonuses" | "testimonials";

// Reordering used to mean hand-typing a display_order number and guessing
// how it'd land relative to everything else. This swaps display_order with
// the adjacent item instead — an admin just clicks up/down. Resources are
// scoped to their module_id so reordering one module's resources can't
// reshuffle another module's.
async function swapDisplayOrder(
  table: OrderedTable,
  id: string,
  direction: "up" | "down",
  scope?: { column: string; value: string }
) {
  const supabase = createAdminClient();

  const { data, error } = scope
    ? await supabase
        .from(table)
        .select("id, display_order")
        .eq(scope.column, scope.value)
        .order("display_order")
    : await supabase.from(table).select("id, display_order").order("display_order");

  if (error) throw error;

  const items = (data ?? []) as { id: string; display_order: number }[];
  const index = items.findIndex((item) => item.id === id);
  if (index === -1) return;

  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= items.length) return;

  const current = items[index];
  const swap = items[swapIndex];

  const { error: currentError } = await supabase
    .from(table)
    .update({ display_order: swap.display_order })
    .eq("id", current.id);
  if (currentError) throw currentError;

  const { error: swapError } = await supabase
    .from(table)
    .update({ display_order: current.display_order })
    .eq("id", swap.id);
  if (swapError) throw swapError;
}

export async function moveModule(id: string, direction: "up" | "down"): Promise<ActionResult> {
  return runAdminAction(async () => {
    await swapDisplayOrder("modules", id, direction);
    revalidatePath("/admin/modules");
  });
}

export async function moveResource(id: string, moduleId: string, direction: "up" | "down"): Promise<ActionResult> {
  return runAdminAction(async () => {
    await swapDisplayOrder("resources", id, direction, { column: "module_id", value: moduleId });
    revalidatePath("/admin/modules");
  });
}

export async function moveBonus(id: string, direction: "up" | "down"): Promise<ActionResult> {
  return runAdminAction(async () => {
    await swapDisplayOrder("bonuses", id, direction);
    revalidatePath("/admin/bonuses");
  });
}

export async function moveTestimonial(id: string, direction: "up" | "down"): Promise<ActionResult> {
  return runAdminAction(async () => {
    await swapDisplayOrder("testimonials", id, direction);
    revalidatePath("/admin/testimonials");
  });
}
