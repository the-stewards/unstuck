-- UNSTUCK LMS - lead capture (RSVP / waitlist forms, embeddable widget)
-- Additive only. All three tables: RLS on, zero client-facing policies -
-- service-role only, so lead emails/phones are never readable via the anon key.

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  form_key text not null,
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text,
  sms_consent boolean not null default false,
  -- Exact wording shown next to the checkbox + when/where it was given, in
  -- case consent is ever challenged.
  consent_text text,
  consent_at timestamptz,
  ip text,
  user_agent text,
  ref text,
  created_at timestamptz not null default now()
);

-- One fill per email per form (a second form later must not collide).
create unique index leads_form_email_idx on public.leads (form_key, lower(email));
create index leads_form_created_idx on public.leads (form_key, created_at desc);

-- Outbox for third-party delivery (Zapier/GHL). Written atomically with the
-- lead; flushed by a later change order. The form response never waits on it.
create table public.lead_outbox (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  event text not null,
  payload jsonb not null,
  attempts int not null default 0,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index lead_outbox_unsent_idx on public.lead_outbox (created_at) where sent_at is null;

-- Postgres-backed rate limit so it holds across serverless instances.
create table public.rate_limits (
  key text primary key,
  window_start timestamptz not null default now(),
  count int not null default 0
);

alter table public.leads enable row level security;
alter table public.lead_outbox enable row level security;
alter table public.rate_limits enable row level security;
-- No policies: service-role only.

-- Atomic lead + outbox insert in one round trip. A duplicate (form_key,
-- email) raises 23505, which the API maps to a friendly 409.
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
  p_ref text
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
    sms_consent, consent_text, consent_at, ip, user_agent, ref
  ) values (
    p_form_key, p_first_name, p_last_name, lower(p_email), p_phone,
    p_sms_consent, p_consent_text, case when p_sms_consent then now() end,
    p_ip, p_user_agent, p_ref
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
    'created_at', v_created
  ));

  return v_id;
end;
$$;

-- Returns true when the caller is OVER the limit. Single atomic upsert; the
-- window resets once it has elapsed.
create or replace function public.hit_rate_limit(
  p_key text,
  p_max int,
  p_window_seconds int
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  insert into public.rate_limits as r (key, window_start, count)
  values (p_key, now(), 1)
  on conflict (key) do update
    set window_start = case
          when r.window_start < now() - make_interval(secs => p_window_seconds) then now()
          else r.window_start end,
        count = case
          when r.window_start < now() - make_interval(secs => p_window_seconds) then 1
          else r.count + 1 end
  returning count into v_count;

  return v_count > p_max;
end;
$$;

revoke all on function public.submit_lead(text, text, text, text, text, boolean, text, text, text, text) from public, anon, authenticated;
revoke all on function public.hit_rate_limit(text, int, int) from public, anon, authenticated;
grant execute on function public.submit_lead(text, text, text, text, text, boolean, text, text, text, text) to service_role;
grant execute on function public.hit_rate_limit(text, int, int) to service_role;
