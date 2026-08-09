"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { upsertProgress, completeProgress } from "@/lib/progress";

async function requireUserId(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not signed in.");
  }

  return user.id;
}

export async function updateProgress(moduleId: string, watchPositionSeconds: number) {
  const userId = await requireUserId();
  return upsertProgress(userId, moduleId, watchPositionSeconds);
}

export async function markModuleComplete(moduleId: string) {
  const userId = await requireUserId();
  const result = await completeProgress(userId, moduleId);
  revalidatePath("/dashboard");
  return result;
}
