-- UNSTUCK LMS - homeowner qualifying question on the RSVP form.
-- Adds leads.homeowner_status and carries it through submit_lead into the
-- outbox payload (so the Zap can filter on it). Existing rows stay NULL.
--
-- submit_lead gains a trailing parameter WITH A DEFAULT. A new overload next to
-- the old one would make PostgREST calls ambiguous, so the old 10-argument
-- signature is dropped in the same script; callers still using 10 named
-- arguments (the previously deployed API) resolve to the new function.

alter table public.leads
  add column if not exists homeowner_status text
  check (homeowner_status in ('owner_central_ohio', 'renter', 'outside_area'));

create index if not exists leads_homeowner_status_idx on public.leads (form_key, homeowner_status);

drop function if exists public.submit_lead(text, text, text, text, text, boolean, text, text, text, text);

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
  p_homeowner_status text default null
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
    sms_consent, consent_text, consent_at, ip, user_agent, ref, homeowner_status
  ) values (
    p_form_key, p_first_name, p_last_name, lower(p_email), p_phone,
    p_sms_consent, p_consent_text, case when p_sms_consent then now() end,
    p_ip, p_user_agent, p_ref, p_homeowner_status
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
    'created_at', v_created
  ));

  return v_id;
end;
$$;

revoke all on function public.submit_lead(text, text, text, text, text, boolean, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.submit_lead(text, text, text, text, text, boolean, text, text, text, text, text) to service_role;
