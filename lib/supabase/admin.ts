import "server-only";
import { createClient } from "@supabase/supabase-js";

// Service-role client — bypasses RLS. Only for server code that needs to
// read/write access_grants, orders, or other tables with no client policies.
// Never import this from a Client Component or expose the key to the browser.
//
// Not parameterized with Database — see lib/types.ts for why.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
