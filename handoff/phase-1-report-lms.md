# Phase 1 Report — Schema and Types

**Status:** Complete

## What shipped
- `supabase/migrations/0001_init.sql` — 9 tables per spec: `students`, `modules`, `resources`, `progress`, `access_grants`, `orders`, `bonuses`, `student_bonus_status`, `testimonials`
- RLS enabled on every table. `access_grants` and `orders` have **no** client-side policies at all — deliberately service-role-only, since exposing "does email X have access" via a client-queryable table would leak purchase status across users
- `auth.users` → `public.students` sync via a `security definer` trigger (`handle_new_user`), so a student row always exists once a Supabase auth account does
- `lib/types.ts` — hand-written types matching the schema (flagged in a comment to regenerate via `supabase gen types typescript` once a real project exists, and diff rather than blind-overwrite)

## Decisions worth flagging
- **`modules.duration_seconds` added** — not explicitly in the spec's module fields list, but required by the Option B time-elapsed completion heuristic ("elapsed active time meets or exceeds video duration"). No duration data means no completion signal at all, so this isn't optional.
- **`progress.watch_position_seconds` doubles as the heuristic's elapsed-time counter** in v1, rather than adding a separate column. It's the one field the spec already puts in this table for exactly this purpose; swapping to real Dubb watch-position data later needs no schema change.
- **Admin access via `ADMIN_EMAILS` env allowlist, not a `staff` table.** Two fixed admins (Ryan, Chris) — a role/permissions table would be unused abstraction for a static 2-person list. `access_grants.granted_by` stores the admin's email as plain text rather than a foreign key.
- **`student_bonus_status` and `access_grants` are keyed by email, not `student_id`.** Matches the spec directly: access and bonus eligibility can exist before a student ever logs in (Stripe purchase pre-auth, webinar opt-in flag), so email is the only stable join key at that point.

## Gates
- Typecheck: clean
- Lint: clean
- `git status`: clean after commit
- Commits: `c2188be` (schema+types), `be1b4f5` (phase 0 report, prior phase)

## Assumed
- No live Supabase project yet — this migration is unapplied SQL. It'll run via `supabase db push` (or pasted into the SQL editor) once Ryan hands off a project, ahead of Phase 6.
