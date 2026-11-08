-- UNSTUCK LMS - Meta Lead on first verified sign-in.
-- The student row (auto-created for every auth user) carries the per-person
-- "already reported to Meta" flag, the channel they came from, and when their
-- first verified sign-in happened. Together with leads.meta_lead_sent_at (0010)
-- this guarantees one Lead per person, whichever path they arrive by.
--
-- Additive only: three nullable columns and one partial index. No existing row
-- or constraint is changed, nothing is dropped.

alter table public.students add column if not exists signup_ref text;           -- channel (meta / ig), reporting only; never sent to Meta
alter table public.students add column if not exists first_verified_at timestamptz;
alter table public.students add column if not exists meta_lead_sent_at timestamptz;

-- Keeps the retry query cheap: verified sign-ins Meta hasn't confirmed yet.
create index if not exists students_meta_unsent_idx
  on public.students (first_verified_at)
  where meta_lead_sent_at is null and first_verified_at is not null;
