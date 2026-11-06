-- UNSTUCK LMS - Meta Conversions API: one server-side Lead per qualified RSVP.
-- meta_lead_sent_at is the "already reported" flag. The sender sets it only after
-- Meta confirms receipt; anything still NULL is retried (Meta accepts events up
-- to 7 days old, the retry job looks back 3).
--
-- Additive only: no existing rows are changed, nothing is dropped.

alter table public.leads add column if not exists meta_lead_sent_at timestamptz;

-- Keeps the retry query cheap: only qualified, still-unreported rows.
create index if not exists leads_meta_unsent_idx
  on public.leads (created_at)
  where meta_lead_sent_at is null and homeowner_status = 'owner_central_ohio';
