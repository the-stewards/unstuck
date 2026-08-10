-- UNSTUCK LMS — bonus content delivery
-- Bonuses previously had no way to actually deliver anything once unlocked
-- (title/description/value_prop only). Nullable since existing bonuses
-- won't have one set until an admin adds it.

alter table public.bonuses add column content_url text;
