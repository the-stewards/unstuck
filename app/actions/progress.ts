"use server";

import { createClient } from "@/lib/supabase/server";
import { upsertProgress } from "@/lib/progress";

export async function updateProgress(moduleId: string, watchPositionSeconds: number) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not signed in.");
  }

  const { data: courseModule, error } = await supabase
    .from("modules")
    .select("duration_seconds")
    .eq("id", moduleId)
    .single();

  if (error || !courseModule) {
    throw new Error("Module not found.");
  }

  const durationSeconds = (courseModule as { duration_seconds: number }).duration_seconds;
  return upsertProgress(user.id, moduleId, watchPositionSeconds, durationSeconds);
}
