-- UNSTUCK LMS — coming-soon status for modules and bonuses
-- Lets an admin publish a module/bonus's title ahead of its content being
-- ready, so students see the roadmap ("more is coming") instead of either
-- nothing or a broken/empty page. Defaults to 'published' so every existing
-- row keeps behaving exactly as it does today.

alter table public.modules
  add column status text not null default 'published'
  check (status in ('published', 'coming_soon'));

alter table public.bonuses
  add column status text not null default 'published'
  check (status in ('published', 'coming_soon'));
