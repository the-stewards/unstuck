-- Fixes a Codex-review P1: modules/resources/bonuses/testimonials policies
-- only checked auth.role() = 'authenticated', which is true for anyone who
-- has ever requested a magic link (requestMagicLink doesn't check access —
-- correctly, per spec, since access is checked at /dashboard, not at login).
-- That let any authenticated session read course content directly through
-- the Supabase REST API, bypassing the app's requireStudent() gate entirely.
--
-- access_grants itself stays policy-free (service-role only) — this helper
-- is security definer specifically so RLS on the content tables can check
-- it without opening access_grants up to direct client queries.
create function public.has_access(check_email text)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.access_grants
    where lower(access_grants.email) = lower(check_email)
  );
$$;

drop policy "modules select authenticated" on public.modules;
create policy "modules select granted" on public.modules
  for select using (
    auth.role() = 'authenticated' and public.has_access(auth.jwt() ->> 'email')
  );

drop policy "resources select authenticated" on public.resources;
create policy "resources select granted" on public.resources
  for select using (
    auth.role() = 'authenticated' and public.has_access(auth.jwt() ->> 'email')
  );

drop policy "bonuses select authenticated" on public.bonuses;
create policy "bonuses select granted" on public.bonuses
  for select using (
    auth.role() = 'authenticated' and public.has_access(auth.jwt() ->> 'email')
  );

drop policy "testimonials select active authenticated" on public.testimonials;
create policy "testimonials select active granted" on public.testimonials
  for select using (
    auth.role() = 'authenticated'
    and active = true
    and public.has_access(auth.jwt() ->> 'email')
  );
