# HANDOFF - unstuck-lms (UNSTUCK course LMS)

Last updated: 2026-09-29. Read this whole file, then wait for the change order.

## 1. What this is
UNSTUCK: a private course LMS for The Stewards. $47 purchase via Stripe, magic-link login (Supabase),
6-module course with Dubb video embeds, resources, bonuses, testimonials, admin content management,
"book a call" CTA, stalled-student nudge emails (Resend).
- Folder: `DASHBOARD\unstuck-lms`
- Live: https://unstuck.stewards.loan and https://unstuck-lms.vercel.app (Vercel project `unstuck-lms`,
  team of `rynmiracle-6940`, GitHub-connected). DNS: A record `unstuck` -> 76.76.21.21 in the stewards.loan zone.
- Repo: https://github.com/the-stewards/unstuck - **PUBLIC**, branch `master`, 66 commits, latest 2026-09-15
  "Fix verifyOtp call for instant login". (The older build report says 23 commits - it is stale.)
- Recovery check 2026-09-29: identical to GitHub except one local, UNCOMMITTED edit (see section 7).
  Git history restored into the folder (`core.autocrlf=false`; ~115 "modified" files are line-ending noise).

## 2. Scope guard (anti-bleed)
- OWN: everything inside `DASHBOARD\unstuck-lms`.
- DO NOT TOUCH: `top-agent-match` (also Next 16 + Supabase + Resend, but a DIFFERENT Supabase project and
  Vercel project - never reuse its keys or tables), the Ledger, SMC, rebel-affiliate, and the root-level
  `unstuck-thank-you-upsell.html` / `Golden Handcuffs - Unstuck ICP.txt` in `DASHBOARD` (marketing assets,
  read-only unless the change order names them).
- Never run destructive SQL against the live Supabase project. Migrations are additive and reviewed.
- Deploys: this project deploys to **Vercel** (via GitHub push to `master` or `vercel` CLI). Do not deploy
  without Ryan's explicit go-ahead. Netlify is NOT used (see section 7).

## 3. Stack and layout
Next.js **16.3** (App Router, Turbopack), React 19.2, TypeScript, Tailwind v4, Supabase (`@supabase/ssr`,
`supabase-js`), Stripe 22, Resend 6, Zod 4, Vitest 4. Single dark theme.
**Read `AGENTS.md` first: this is NOT the Next.js you know.** Read the relevant guide in
`node_modules/next/dist/docs/` before writing code. Key changes: `proxy.ts` replaces `middleware.ts`;
`params`/`searchParams` are async.
```
proxy.ts                 refreshes the Supabase session cookie every request (best-effort, never throws)
app/
  page.tsx, layout.tsx (AuthHashHandler mounted here), globals.css, error.tsx, global-error.tsx
  login/, auth/confirm/route.ts (PKCE code exchange), dashboard/, module/[id]/, purchase/, purchase/success/,
  privacy/, terms/
  admin/ (page, modules, bonuses, testimonials)  - gated by ADMIN_EMAILS allowlist
  actions/ (auth, admin, content, progress, purchase)  server actions
  api/stripe/checkout, api/stripe/webhook, api/cron/nudge-stalled (+ .test.ts each)
  embed/checkout-widget.js/route.ts   embeddable checkout widget script
lib/  access, action-result, admin, admin-data, course, dubb-embed, notify, nudges, progress, session,
      stripe (lazy client), support, types (+ tests)
components/ AuthHashHandler.tsx, ...
supabase/migrations/ 0001_init, 0002_restrict_content_to_granted, 0003_checkout_attempts,
                     0004_bonus_content_url, 0005_content_status, 0006_nudge_tracking
handoff/  full build paper trail: build-plan-lms, phase-0..6 reports, codex-review-lms, final-report-lms,
          build-log-lms, phase-6-blocked-lms (OBSOLETE - phase 6 was later completed),
          supabase-magic-link-template.html, rsvp-form-replication-review.md (NEW 2026-09-29)
netlify.toml (legacy, broken - see below), vercel.json, vitest.config.mts, proxy.test.ts
```

## 4. How it works (key contracts)
- **Access model:** `access_grants` table, one `grantAccess()` entry, idempotent (check-then-insert plus unique
  constraint fallback). Granted by Stripe webhook or admin manual comp. `orders` table is bookkeeping.
- **Stripe:** $47 Checkout. The signature-verified webhook is what grants access (not the success redirect).
  `lib/stripe.ts` builds the client lazily (an eager client crashed `next build`).
- **RLS:** every table has RLS. `access_grants`/`orders` have NO client policies (service-role only). Course
  content requires a real `access_grants` row via `has_access(email)`, not just an authenticated session.
- **Auth:** two permanent flows. (a) `signInWithOtp` from the login form -> `?code=` PKCE ->
  `auth/confirm/route.ts`. (b) admin `generateLink()` (used for post-purchase access emails in
  `lib/notify.ts`) -> `#access_token=` fragment -> `AuthHashHandler`. Both are required.
- **Progress:** v1 time-elapsed heuristic (15s visibility-gated ticks); Dubb has no confirmed completion API.
- **Admin:** static `ADMIN_EMAILS` allowlist. Admin reads use the service-role client (not RLS client).
- **Nudges:** `/api/cron/nudge-stalled` (see `vercel.json` for the cron) emails stalled students (migration 0006).
- **Notify:** `lib/notify.ts` checks Resend's `{data, error}` response (a failed send used to report success).

## 5. Environment (names only; values in `.env.local` locally and Vercel prod env)
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`,
`NEXT_PUBLIC_STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`,
`NEXT_PUBLIC_APP_URL` (local: http://localhost:5193), `ADMIN_EMAILS`, `NEXT_PUBLIC_BOOKING_URL`,
`VERCEL_OIDC_TOKEN` (auto-created by Vercel CLI; expires; never commit).
**The local `.env.local` Stripe key is TEST mode (`sk_test`).** Per the final report, production also runs
Stripe TEST keys with a test-mode webhook. **Going live with real payments needs live keys, a live price,
and a live webhook - a change order, and a real-money stop-rule item.**

## 6. Run / verify
```bash
cd "C:\Users\ry_mi\OneDrive\Desktop\CLAUDE CODE\DASHBOARD\unstuck-lms"
npm.cmd test                       # 13 files / 50 tests, all passing on 2026-09-29
npm.cmd run dev -- -p 5193         # http://localhost:5193  (/ and /login return 200)
npm.cmd run build                  # not re-run since the reset
```
- The first `npm test` run after a cold start can time out one Stripe-import test (5s); a second run passes.
- Local dev talks to the REAL Supabase project referenced in `.env.local` (real auth, real rows).
- Vercel CLI 61 is installed and logged in; folder is linked via `.vercel/project.json`.
- Definition of done for a change: tests pass, `next build` passes, and (for auth/payments/data) a real-system
  check with evidence (row from a live query, real API response, real timestamp/ID). See the walkaway protocol.

## 7. Known issues / gotchas / uncommitted work
- **UNCOMMITTED local edit:** `vitest.config.mts` gained `"@": path.resolve(import.meta.dirname)` in
  `resolve.alias` because `vite-tsconfig-paths` did not resolve `@/` after the machine reset. Commit it (or
  verify it is still needed) on the first change order.
- **Netlify deploys are broken** for this project (`@netlify/plugin-nextjs@5.15.13` cannot bundle `proxy.ts`
  under Next 16). `netlify.toml` documents it. Use Vercel.
- The GitHub repo is PUBLIC and includes `handoff/` (internal build notes). Decide whether to make it private.
- Content tables (modules/resources/bonuses/testimonials) were EMPTY at last report; add via `/admin/*`.
- A demo row exists in `access_grants` for `rynmiracle@gmail.com` (`source: manual_comp`,
  `granted_by: demo-script`). Delete or re-grant properly.
- Supabase Auth SMTP is not yet pointed at Resend (dashboard setting) - login emails use Supabase's mailer.
- No "resend access email" action once a grant exists. No drag-and-drop reordering (numeric order field).
- `supabase-js` `Database` generic was dropped from the three clients (type-inference break) - see `lib/types.ts`.
- Root `CLAUDE.md` here is just `@AGENTS.md`.

## 8. Open work
1. **Lead-capture / RSVP form with a live fill counter**, mirroring the rebel-affiliate RSVP form. Full review
   and proposed build are in `handoff/rsvp-form-replication-review.md`. **Blocked on five answers from Ryan**
   (where it lives, what it is for, where fills go, counter threshold, test vs live Supabase). This is a
   "real build": write the plan first, get "lock it in", then phase it.
2. Housekeeping above (commit vitest alias, seed content, demo grant, public repo decision).

## 9. Change-order intake
(One entry per request: date, what, acceptance check. Cross-project asks are notes only.)

## 10. Session rules
Ryan's style: act, do not ask; short; hyphens; verify with evidence. Real builds follow
`claude-workflow/walkaway-build-protocol.md` (phases, gates, phase reports in `handoff/`). Stop before
real-money changes, production deploys, destructive SQL, or messages to real users. Do not print secrets.
