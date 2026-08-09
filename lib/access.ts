import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AccessGrant, AccessSource } from "@/lib/types";

interface GrantAccessParams {
  email: string;
  source: AccessSource;
  grantedBy?: string | null;
  stripeSessionId?: string | null;
}

interface GrantAccessResult {
  granted: boolean; // true only if this call created the grant
  alreadyGranted: boolean;
}

const UNIQUE_VIOLATION = "23505";

// The single entry point for granting LMS access, regardless of how someone
// paid. The app only ever asks "does access_grants have a row for this
// email" — never "did they pay or get comped." Check-then-insert plus the
// unique(email) constraint as a fallback covers the case where two calls
// race (e.g. a retried Stripe webhook).
export async function grantAccess({
  email,
  source,
  grantedBy = null,
  stripeSessionId = null,
}: GrantAccessParams): Promise<GrantAccessResult> {
  const supabase = createAdminClient();
  const normalizedEmail = email.trim().toLowerCase();

  const existing = await getAccessGrant(normalizedEmail);
  if (existing) {
    return { granted: false, alreadyGranted: true };
  }

  const { error } = await supabase.from("access_grants").insert({
    email: normalizedEmail,
    source,
    granted_by: grantedBy,
    stripe_session_id: stripeSessionId,
  });

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      return { granted: false, alreadyGranted: true };
    }
    throw error;
  }

  return { granted: true, alreadyGranted: false };
}

export async function checkAccess(email: string): Promise<boolean> {
  const grant = await getAccessGrant(email);
  return grant !== null;
}

export async function getAccessGrant(email: string): Promise<AccessGrant | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("access_grants")
    .select("*")
    .eq("email", email.trim().toLowerCase())
    .maybeSingle();

  if (error) throw error;
  return data as AccessGrant | null;
}
