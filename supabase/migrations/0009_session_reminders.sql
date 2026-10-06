-- UNSTUCK LMS - per-session reminders.
-- Each RSVP is now tied to the specific Thursday session it was for
-- (leads.session_at), so reminders are scheduled per session and a person can
-- RSVP again for a later session. Existing rows keep session_at NULL and are
-- never sent reminders.
--
-- NOTE: drops the old unique index (one RSVP per email forever) and the old
-- 11-argument submit_lead signature (replaced below with a 12th parameter that
-- has a default, so a deployed API still sending 11 named arguments keeps working).

alter table public.leads add column if not exists session_at timestamptz;

create index if not exists leads_session_at_idx on public.leads (session_at) where session_at is not null;

-- One RSVP per person PER SESSION (NULL session_at on legacy rows stays distinct).
drop index if exists public.leads_form_email_idx;
create unique index if not exists leads_form_email_session_idx
  on public.leads (form_key, lower(email), session_at);

-- Which reminder emails have been sent to which lead. The primary key is the
-- idempotency guard: inserting (lead_id, kind) first "claims" the send.
create table if not exists public.lead_reminders (
  lead_id uuid not null references public.leads (id) on delete cascade,
  kind text not null check (kind in ('t24h', 't1h', 'tnow', 'after')),
  sent_at timestamptz not null default now(),
  primary key (lead_id, kind)
);

-- Addresses that unsubscribed from session emails.
create table if not exists public.email_suppressions (
  email text primary key,
  reason text not null default 'unsubscribe',
  created_at timestamptz not null default now()
);

alter table public.lead_reminders enable row level security;
alter table public.email_suppressions enable row level security;
-- No policies: service-role only.

drop function if exists public.submit_lead(text, text, text, text, text, boolean, text, text, text, text, text);

create or replace function public.submit_lead(
  p_form_key text,
  p_first_name text,
  p_last_name text,
  p_email text,
  p_phone text,
  p_sms_consent boolean,
  p_consent_text text,
  p_ip text,
  p_user_agent text,
  p_ref text,
  p_homeowner_status text default null,
  p_session_at timestamptz default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_created timestamptz;
begin
  insert into public.leads (
    form_key, first_name, last_name, email, phone,
    sms_consent, consent_text, consent_at, ip, user_agent, ref, homeowner_status, session_at
  ) values (
    p_form_key, p_first_name, p_last_name, lower(p_email), p_phone,
    p_sms_consent, p_consent_text, case when p_sms_consent then now() end,
    p_ip, p_user_agent, p_ref, p_homeowner_status, p_session_at
  ) returning id, created_at into v_id, v_created;

  insert into public.lead_outbox (lead_id, event, payload)
  values (v_id, 'new_lead', jsonb_build_object(
    'form_key', p_form_key,
    'first_name', p_first_name,
    'last_name', p_last_name,
    'email', lower(p_email),
    'phone', p_phone,
    'sms_consent', p_sms_consent,
    'ref', p_ref,
    'homeowner_status', p_homeowner_status,
    'session_at', p_session_at,
    'created_at', v_created
  ));

  return v_id;
end;
$$;

revoke all on function public.submit_lead(text, text, text, text, text, boolean, text, text, text, text, text, timestamptz) from public, anon, authenticated;
grant execute on function public.submit_lead(text, text, text, text, text, boolean, text, text, text, text, text, timestamptz) to service_role;
