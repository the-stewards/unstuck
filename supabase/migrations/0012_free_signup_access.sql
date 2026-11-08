-- UNSTUCK is free: a confirmed signup is granted access automatically, recorded
-- with its own source so reports can tell free signups from purchases and comps.
--
-- Widens the allowed values of access_grants.source from
--   ('stripe_purchase', 'manual_comp')
-- to
--   ('stripe_purchase', 'manual_comp', 'free_signup').
-- Every existing row stays valid; nothing is deleted or rewritten. The old check is
-- found by its definition (not its name) and replaced inside one transaction, so
-- there is never a moment without the constraint.

begin;

do $$
declare
  old_check text;
begin
  select conname into old_check
  from pg_constraint
  where conrelid = 'public.access_grants'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%stripe_purchase%';

  if old_check is not null then
    execute format('alter table public.access_grants drop constraint %I', old_check);
  end if;

  alter table public.access_grants
    add constraint access_grants_source_check
    check (source in ('stripe_purchase', 'manual_comp', 'free_signup'));
end
$$;

commit;
