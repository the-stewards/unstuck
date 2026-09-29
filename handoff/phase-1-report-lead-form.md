# Phase 1 Report - Lead form schema
Status: complete. `supabase/migrations/0007_leads.sql` written, NOT applied (applied in Phase 6 with sign-off).
- Tables: leads, lead_outbox, rate_limits. RLS on, zero policies.
- Unique index (form_key, lower(email)).
- Functions: submit_lead (atomic lead + outbox), hit_rate_limit (atomic upsert). security definer, EXECUTE revoked from public/anon/authenticated, granted to service_role only.
- Additive only, no DROP/DELETE.
