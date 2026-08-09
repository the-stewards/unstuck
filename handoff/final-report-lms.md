# Final Build Report — UNSTUCK LMS (unstuck-lms)

**Plan:** [build-plan-lms.md](build-plan-lms.md) | **Status:** Phases 0-7 complete, all gates clean. Pushed to [github.com/the-stewards/unstuck](https://github.com/the-stewards/unstuck). Migration `0002` (Phase 7's RLS fix) applied to the live Supabase project and verified. A critical post-Phase-8 bug (magic link never actually logged anyone in) found, fixed, and verified live — see below.

## What shipped

A working Next.js 16 + Supabase + Stripe + Resend LMS, verified against real infrastructure, not just tests:

- **Auth** — Supabase magic-link login, session refresh via `proxy.ts` (Next 16 renamed `middleware.ts`), self-serve resend
- **Access model** — unified `access_grants` table, one `grantAccess()` entry point for both Stripe purchases and manual admin comps, idempotent two ways (check-then-insert + a unique-constraint fallback for races)
- **Course** — 6-module structure (soft-lock navigation, checkmark only on completion), Dubb iframe embeds, companion resource downloads, v1 time-elapsed completion heuristic (15s visibility-gated ticks, since Dubb has no confirmed completion-event API)
- **Payments** — $47 Stripe Checkout, signature-verified idempotent webhook that's what actually grants access (not the redirect)
- **Admin** — manual grant tool with a mandatory existing-purchase check, per-student call-status toggle, student/progress table
- **Conversion system** — bonus lock/reactivation display, testimonials, persistent "book a call" CTA that softens once booked
- **RLS** — every table has row-level security; `access_grants`/`orders` have zero client-facing policies (service-role only); course content requires an actual `access_grants` row, not just an authenticated session (fixed in Phase 7 — see below)
- **32 tests** — unit, integration, and regression, all passing
- **9 commits worth of real bugs found and fixed**, each verified against the actual running system rather than assumed fixed from a code read:
  1. Eager Stripe/Resend client instantiation crashed `next build`
  2. `proxy.ts` had no error handling — any Supabase hiccup 500'd every page, including ones needing no session
  3. `requestMagicLink` and the checkout route didn't honor their own "never throw" contracts — crashed the page on a live failure instead of showing an inline error
  4. **(Phase 7, Codex-found)** RLS on modules/resources/bonuses/testimonials only checked "authenticated," not "has access" — any magic-link requester could read course content directly via the Supabase REST API, bypassing the app's `requireStudent()` gate entirely. **Fix applied to the live project and verified**: `has_access('rynmiracle@gmail.com')` → `true`, `has_access('nobody@example.com')` → `false`, via a real RPC call.
  5. **(Phase 7, Codex-found)** The Stripe webhook's order-insert ran as a dedup gate *before* granting access — a failure partway through meant a retry would permanently skip fulfillment
  6. **(Phase 7, Codex-found)** Resend's `{data, error}` response was never checked — a failed send silently reported success
  7. **(Post-Phase-8, found while getting real screenshots)** The magic-link login never actually established a session. This Supabase project's verify redirect uses the implicit flow — tokens in the URL fragment (`#access_token=...`), which only client-side JS can see. Nothing in the app ever read them, so `requireStudent()` always found no session and silently bounced back to `/login`, dropping the token. **No student could have ever logged in.** Every gate up to this point — typecheck, lint, build, 32 tests, even the Phase 6 smoke test — was green, because none of them clicked an actual link in a browser. Found by generating a real `generateLink()` link and following it myself; fixed with `components/AuthHashHandler.tsx` (picks up the fragment client-side, calls `setSession()`, routes to `/dashboard`); re-verified with a second fresh link — it now correctly reaches `requireStudent()`'s access check instead of dying at the session check.

## Real-system evidence (Phase 6 + re-verification in Phase 7)
- Real Supabase Auth call → real `students`/`auth.users` rows (live query, real UUID/timestamp)
- Real Stripe Checkout session → landed on an actual `checkout.stripe.com` page with the right price and email
- Real signature-verified webhook round trip (via Stripe CLI, since no public URL exists yet for a live-registered endpoint) → real `orders`/`access_grants` rows
- Real Resend send confirmed working to real addresses (the sandbox-domain rejection during testing was Resend correctly blocking a fake fixture domain, not an account problem)
- Post-Phase-7-fix re-verification: triggered a second real webhook event for the same email — got 2 order rows (bookkeeping, correctly unblocked) and exactly 1 `access_grants` row (grant correctly deduplicated)

## Decisions made without asking (surfaced here per operating agreement)
- Admin gate is a static `ADMIN_EMAILS` allowlist, not a staff table/role system — two fixed admins don't need one
- Progress tracking ships on the time-elapsed heuristic now; schema is structured so swapping in real Dubb watch-position data later needs no migration
- Dropped the `Database` generic from all three Supabase clients after it broke `.insert()`/`.eq().single()` type inference against this project's installed `@supabase/supabase-js@2.112` + `typescript@5.9` — traced to a 2-table reproduction, documented in `lib/types.ts`, not a schema mistake
- Single dark theme, no light mode — fits the "private library" exclusivity framing, no public marketing surface where it'd matter
- Codex CLI substituted the literal `codex review --base main` command with `--base review-base` (a local branch pinned at the Phase 0 commit) since this repo has no `main`/remote

## Not done — needs a decision or action from Ryan
1. **No deploy yet.** `netlify.toml` is in place but the project has never been deployed; DNS for `unstuck.stewards.loan` is unconfigured (explicit non-goal from the build plan).
2. **Real seed content.** All 6 modules, their Dubb URLs/durations, resources, bonuses, and testimonials are still empty tables — nothing to actually show a student yet.
3. **Follow-up flagged, not fixed:** no way to resend the access-granted email once a grant already exists (both the webhook and admin manual-grant gate the email on "this call newly created the grant"). Worth a small admin "resend" action later.
4. **Supabase Auth SMTP** isn't yet pointed at Resend — plain login/resend emails currently ride Supabase's default mailer, not the properly-configured sending domain the spec calls out for deliverability at scale. Dashboard setting, not code.
5. **Implicit-flow tokens in the URL are a minor security wrinkle worth revisiting**, even though `AuthHashHandler` makes them work correctly now: the access/refresh tokens briefly sit in browser history and the URL bar before being stripped. Migrating to PKCE flow (a Supabase Auth dashboard setting) plus a dedicated `/auth/confirm` server route would avoid that entirely — more correct long-term, not required for the current fix to be safe or functional.
6. **`access_grants` currently has a demo row** for `rynmiracle@gmail.com` (`source: manual_comp`, `granted_by: demo-script`) added so real screenshots could be taken — worth deleting or re-granting properly through the admin panel if you don't want it there.

## Repo state
`unstuck-lms/`, 18 commits on `master`, pushed to [github.com/the-stewards/unstuck](https://github.com/the-stewards/unstuck), working tree clean. `handoff/` has a report for every phase plus the Codex review — that's the full paper trail if picking this back up later.
