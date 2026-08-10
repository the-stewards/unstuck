"use server";

import { getOrderBySessionId } from "@/lib/course";

export async function checkOrderStatus(
  sessionId: string
): Promise<{ found: boolean; email: string | null }> {
  const order = await getOrderBySessionId(sessionId);
  return { found: !!order, email: order?.email ?? null };
}
