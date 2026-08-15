-- UNSTUCK LMS — stalled-student nudge tracking
-- Tracks the last time a student was sent a "come back" nudge email, so the
-- daily cron (see app/api/cron/nudge-stalled) doesn't re-email the same
-- stalled student every single day it keeps qualifying.

alter table public.students add column last_nudged_at timestamptz;
