-- UNSTUCK LMS — abandoned-checkout tracking
-- Logged by /api/stripe/checkout on every session created, regardless of
-- whether the customer completes payment. Same pattern as orders/access_grants:
-- RLS on, zero client-facing policies — service-role only.

create table public.checkout_attempts (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  stripe_session_id text not null unique,
  created_at timestamptz not null default now()
);

create index checkout_attempts_email_idx on public.checkout_attempts (email);

alter table public.checkout_attempts enable row level security;
-- No policies: service-role only.
