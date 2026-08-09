-- UNSTUCK LMS — initial schema
-- Access model: access_grants is the single source of truth for "does this email
-- have access" — the app never asks how (Stripe vs. manual comp). No client-side
-- (anon/authenticated) policies exist on access_grants or orders: those tables are
-- only ever read/written server-side with the service-role key.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- students
-- ---------------------------------------------------------------------------
create table public.students (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  name text,
  call_status text not null default 'not_booked'
    check (call_status in ('not_booked', 'booked', 'completed')),
  created_at timestamptz not null default now()
);

alter table public.students enable row level security;

create policy "students select own" on public.students
  for select using (auth.uid() = id);

create policy "students update own" on public.students
  for update using (auth.uid() = id);

-- New auth.users rows get a matching students row automatically.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.students (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- modules
-- ---------------------------------------------------------------------------
create table public.modules (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  dubb_url text not null,
  duration_seconds integer not null,
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.modules enable row level security;

create policy "modules select authenticated" on public.modules
  for select using (auth.role() = 'authenticated');

-- ---------------------------------------------------------------------------
-- resources (one-or-more companion downloads per module)
-- ---------------------------------------------------------------------------
create table public.resources (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.modules (id) on delete cascade,
  title text not null,
  type text not null check (type in ('checklist', 'toolkit', 'guide', 'script')),
  file_url text not null,
  display_order integer not null default 0
);

create index resources_module_id_idx on public.resources (module_id);

alter table public.resources enable row level security;

create policy "resources select authenticated" on public.resources
  for select using (auth.role() = 'authenticated');

-- ---------------------------------------------------------------------------
-- progress
-- watch_position_seconds doubles as the elapsed-active-time counter for the v1
-- time-heuristic completion model; status flips to 'complete' once it meets
-- modules.duration_seconds. Swapping in real Dubb watch-position data later
-- (Option A) needs no schema change.
-- ---------------------------------------------------------------------------
create table public.progress (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  module_id uuid not null references public.modules (id) on delete cascade,
  status text not null default 'not_started'
    check (status in ('not_started', 'in_progress', 'complete')),
  watch_position_seconds integer not null default 0,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (student_id, module_id)
);

create index progress_student_id_idx on public.progress (student_id);

alter table public.progress enable row level security;

create policy "progress select own" on public.progress
  for select using (auth.uid() = student_id);

create policy "progress insert own" on public.progress
  for insert with check (auth.uid() = student_id);

create policy "progress update own" on public.progress
  for update using (auth.uid() = student_id);

-- ---------------------------------------------------------------------------
-- access_grants — unified access model (source-agnostic)
-- ---------------------------------------------------------------------------
create table public.access_grants (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  source text not null check (source in ('stripe_purchase', 'manual_comp')),
  granted_by text, -- staff email; null for stripe_purchase
  stripe_session_id text,
  granted_at timestamptz not null default now()
);

alter table public.access_grants enable row level security;
-- No policies: service-role only. Client code must never query this table directly.

-- ---------------------------------------------------------------------------
-- orders — payment record, kept separate from access_grants for refund handling
-- ---------------------------------------------------------------------------
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  stripe_session_id text not null unique,
  stripe_customer_id text,
  email text not null,
  amount_cents integer not null,
  created_at timestamptz not null default now()
);

alter table public.orders enable row level security;
-- No policies: service-role only.

-- ---------------------------------------------------------------------------
-- bonuses
-- ---------------------------------------------------------------------------
create table public.bonuses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  value_prop text,
  display_order integer not null default 0
);

alter table public.bonuses enable row level security;

create policy "bonuses select authenticated" on public.bonuses
  for select using (auth.role() = 'authenticated');

-- ---------------------------------------------------------------------------
-- student_bonus_status
-- Keyed by email (not student_id) to match the source-agnostic access model —
-- a status can exist before a student ever logs in (e.g. webinar opt-in flag).
-- ---------------------------------------------------------------------------
create table public.student_bonus_status (
  id uuid primary key default gen_random_uuid(),
  student_email text not null,
  bonus_id uuid not null references public.bonuses (id) on delete cascade,
  status text not null default 'locked_missed'
    check (status in ('locked_missed', 'reactivated', 'included_at_purchase')),
  reactivated_at timestamptz,
  unique (student_email, bonus_id)
);

create index student_bonus_status_email_idx on public.student_bonus_status (student_email);

alter table public.student_bonus_status enable row level security;

create policy "student_bonus_status select own" on public.student_bonus_status
  for select using (lower(student_email) = lower(auth.jwt() ->> 'email'));

-- ---------------------------------------------------------------------------
-- testimonials
-- ---------------------------------------------------------------------------
create table public.testimonials (
  id uuid primary key default gen_random_uuid(),
  client_name text not null,
  quote text not null,
  result_stat text,
  photo_url text,
  display_order integer not null default 0,
  active boolean not null default true
);

alter table public.testimonials enable row level security;

create policy "testimonials select active authenticated" on public.testimonials
  for select using (auth.role() = 'authenticated' and active = true);
