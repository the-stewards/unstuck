# Build Plan — Small Course LMS (unstuck.stewards.loan)

## Goal
Standalone Next.js LMS at `unstuck.stewards.loan` — magic-link auth, Dubb video modules with progress tracking, $47 Stripe purchase + manual comp access, bonus/CTA/testimonial conversion system. Deployed on Netlify, matching the existing subdomain pattern (`ledger.stewards.loan`, `move.stewards.loan`).

## Non-goals (explicit scope cuts for v1)
- Dubb API polling for real completion detection — v1 ships the time-elapsed heuristic (`visibilitychange` + active-time timer vs. known duration), structured so Option A (API polling) can swap in later without touching the `progress` table schema
- Webinar registration/landing page — external, feeds the `/purchase` page but isn't built here
- Booking-tool webhook — `call_status` is admin-manual-toggle only in v1, not wired to Calendly/Acuity
- `charge.refunded` auto-revoke — refunds are a manual admin step in v1
- Real account/infra provisioning — Claude will not create the Supabase project, Stripe account, or Netlify site, generate real API keys, or configure DNS for `unstuck.stewards.loan` (stop rule: auth/billing/secrets/DNS). Code, schema, and `.env.example` ship regardless; Phase 6 smoke test and any live deploy need Ryan to hand off real Supabase + Stripe test-mode + Resend keys first.
- No emails sent to real students — dev/test addresses only

## Acceptance criteria
- Email in at `/login` → magic link → lands directly in dashboard at resume point
- Dashboard: module list with per-module status, overall progress %, soft-lock nav (everything clickable, nothing greyed out)
- `/module/[id]`: Dubb iframe embed, resource download card, auto-progress tracking (no manual "mark complete"), resumable position, "Next Module" CTA
- `$47` Stripe Checkout → webhook (signature-verified, idempotent) → `access_grants` row → `/purchase/success` + access email
- `/admin`: manual grant-access tool that checks for an existing Stripe purchase first, logs `granted_by`; `call_status` toggle
- Bonus lock/reactivation block, testimonial block, persistent "book a call" CTA — all conditional on `call_status`
- Tests cover access-grant idempotency, progress heuristic, admin duplicate-purchase check
- Phase 6 smoke test shows a real Supabase row and a real Stripe test-mode webhook round trip

## Stack
Next.js 14 (App Router, TS) + Supabase (Postgres + Auth + RLS) + Stripe Checkout + Resend (transactional email, not default Supabase mailer) + Dubb iframe embed + Tailwind. Deploy target: Netlify.

## Data model (Phase 1)
`students`, `modules`, `progress`, `resources`, `access_grants`, `orders`, `bonuses`, `student_bonus_status`, `testimonials` — per spec. RLS: students see only their own `progress`/`student_bonus_status` rows; `access_grants`/`orders`/admin tables locked to service role.

## Phases

**Phase 0 — Prepare**
Scaffold `unstuck-lms/` (Next.js app, Tailwind, `.env.example`, `netlify.toml`), git init, initial commit. No logic.

**Phase 1 — Schema & types**
`supabase/migrations/0001_init.sql` (all 9 tables + RLS policies), `lib/types.ts`. `.env.example` documents every required key (Supabase URL/anon/service, Stripe secret/webhook secret, Resend key, Dubb base — no real values).

**Phase 2 — Data helpers & actions**
`lib/supabase/{client,server}.ts`, `lib/access.ts` (`grantAccess(email, source, metadata)` unified fn), `lib/progress.ts`, server actions for magic-link request / progress update / manual grant / call_status toggle, `app/api/stripe/checkout/route.ts`, `app/api/stripe/webhook/route.ts` (signature verify + idempotent).

**Phase 3 — Read-only UI**
`/login`, `/dashboard`, `/module/[id]`, `/purchase`, `/purchase/success`, `/admin` (read-only view), plus `ModuleCard`, `ProgressBar`, `DubbEmbed`, `BonusLock`, `TestimonialBlock`, CTA banner components. Renders real data, no mutations wired yet.

**Phase 4 — Mutation UI**
Progress-tracking client hook wired to server action, admin grant-access form + call_status toggle wired, self-serve resend-magic-link button, "Next Module" nav.

**Phase 5 — Tests**
Unit: `grantAccess` dedupe logic, progress-heuristic calculation, RLS query scoping. Integration: duplicate webhook event → single grant (idempotency), admin duplicate-purchase check surfaces correctly. Regression tests added for anything found during build.

**Phase 6 — Smoke test** *(blocked until Ryan provides Supabase test project + Stripe test-mode keys)*
Live magic-link request against real Supabase project; real Stripe test Checkout session + test webhook event, verified via a live `access_grants` query.

**Phase 7 — Codex review**
`codex review --base main` (or equivalent) against the diff, triage P1/P2/Noise, fix P1+P2, max 2 cycles.

**Phase 8 — Final report**
Build report, PR opened (not merged), Codex findings documented.

## Stop rules specific to this build
- No Supabase/Stripe/Netlify account creation, no real API key generation, no DNS changes for `unstuck.stewards.loan`
- No real emails outside test addresses
- If Phase 6 is reached without real Supabase + Stripe test credentials in hand, the build stops there with a "waiting on credentials" report — Phases 0-5 (all code, schema, UI, tests) proceed regardless

## Assumed
- Project name/directory: `unstuck-lms` (new dir under `DASHBOARD/`)
- Resend used for transactional email (already in use elsewhere in this workspace, e.g. Ledger)
- New git repo scoped to this project, not the DASHBOARD root
