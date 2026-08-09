# Final Build Report — UNSTUCK LMS (unstuck-lms)

**Plan:** [build-plan-lms.md](build-plan-lms.md) | **Status:** Phases 0-8 complete, all gates clean, plus a full round of post-launch fixes and the admin content-editing UI. **Live at [unstuck.stewards.loan](https://unstuck.stewards.loan)** on its real domain, DNS and auth both confirmed working end to end.

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
  7. **(Post-Phase-8, found while getting real screenshots)** The magic-link login never actually established a session for the admin-generated test links I was using — `admin.generateLink()` (used for the post-purchase access email in `lib/notify.ts`) produces implicit-flow tokens in the URL fragment (`#access_token=...`), which only client-side JS can see. Nothing read them. Fixed with `components/AuthHashHandler.tsx` in the root layout — picks the fragment up, calls `setSession()`, routes to `/dashboard`.
  8. **(Post-Phase-8, found from Ryan's actual click)** The *real* login email — sent via `signInWithOtp()` from the login form's Server Action — turned out to use a completely different flow: `?code=...` (PKCE), not `#access_token=...` (implicit). The two genuinely differ: PKCE needs a code_verifier cookie set in the requesting browser before the auth request starts, which `generateLink()` (no requesting browser) structurally can't do, but `signInWithOtp()` from a real form submission can. **No student could have ever completed a real login** — item 7's fix only covered the admin-email code path, not the actual signup flow. Fixed properly: `app/auth/confirm/route.ts` (the standard Supabase Next.js App Router pattern) reads `?code=`, calls `exchangeCodeForSession()`, redirects to `?next=`. `requestMagicLink`'s `emailRedirectTo` now points there. Both flows are correctly handled now — this isn't a wrinkle to migrate away from later, it's two real, permanent code paths that both needed their own fix.

## Real-system evidence (Phase 6 + re-verification in Phase 7)
- Real Supabase Auth call → real `students`/`auth.users` rows (live query, real UUID/timestamp)
- Real Stripe Checkout session → landed on an actual `checkout.stripe.com` page with the right price and email
- Real signature-verified webhook round trip (via Stripe CLI, since no public URL exists yet for a live-registered endpoint) → real `orders`/`access_grants` rows
- Real Resend send confirmed working to real addresses (the sandbox-domain rejection during testing was Resend correctly blocking a fake fixture domain, not an account problem)
- Post-Phase-7-fix re-verification: triggered a second real webhook event for the same email — got 2 order rows (bookkeeping, correctly unblocked) and exactly 1 `access_grants` row (grant correctly deduplicated)

## Deployment
Live at **https://unstuck.stewards.loan** (real domain, DNS confirmed resolving and SSL issued) and **https://unstuck-lms.vercel.app** (Vercel, project `rynmiracle-6940s-projects/unstuck-lms`, GitHub-connected to `the-stewards/unstuck`). Netlify was tried first (matches other Stewards tools' pattern) but is currently broken for this project: `@netlify/plugin-nextjs@5.15.13` can't bundle `proxy.ts` as an edge function under Next 16 — fails on a missing runtime chunk regardless of bundler (tried Turbopack and `--webpack`, same class of error both times). `netlify.toml` documents this and stays in the repo for whenever the plugin catches up; Vercel was used instead since it builds Next.js itself and supports 16 day one.

Environment variables are set on Vercel's production environment (Supabase, Stripe test keys, Resend, `ADMIN_EMAILS=rynmiracle@gmail.com`). A real Stripe test-mode webhook endpoint is registered pointing at the production URL with its own signing secret. DNS: a single A record (`unstuck` → `76.76.21.21`) added to the `stewards.loan` zone (directorysecure.com nameservers), same pattern as `ledger.stewards.loan`'s CNAME setup but Vercel's own recommended record type.

Supabase's Auth redirect-URL allowlist (the thing blocking real logins right after the initial deploy) has been fixed — confirmed by a fresh `generateLink()` call resolving to `unstuck.stewards.loan` instead of the old `localhost:3000` fallback.

## Admin content management
The original spec's `/admin` page listed three things: add/reorder modules, view student progress, manual access-grant tool. Only the last two got built through Phase 8 — there was no way to fill out the coursework except editing Supabase's Table Editor by hand. Closed now:

- `/admin/modules` — add/edit modules (title, description, Dubb URL, duration, numeric order) plus nested resource management per module
- `/admin/bonuses`, `/admin/testimonials` — same add/edit/delete pattern
- No drag-and-drop reordering — a plain numeric order field, deliberately scoped down to ship the thing that actually unblocks content over a nicer-but-slower version
- All four content tables use the service-role client for admin reads (not the RLS-gated per-request client) — an admin without their own `access_grants` row would otherwise be incorrectly blocked from seeing content by the Phase 7 RLS fix

Verified live end to end: added a real module through the actual form, confirmed the row via a live query, confirmed it immediately appeared on the student dashboard, then cleaned it up.

## Decisions made without asking (surfaced here per operating agreement)
- Admin gate is a static `ADMIN_EMAILS` allowlist, not a staff table/role system — two fixed admins don't need one
- Progress tracking ships on the time-elapsed heuristic now; schema is structured so swapping in real Dubb watch-position data later needs no migration
- Dropped the `Database` generic from all three Supabase clients after it broke `.insert()`/`.eq().single()` type inference against this project's installed `@supabase/supabase-js@2.112` + `typescript@5.9` — traced to a 2-table reproduction, documented in `lib/types.ts`, not a schema mistake
- Single dark theme, no light mode — fits the "private library" exclusivity framing, no public marketing surface where it'd matter
- Codex CLI substituted the literal `codex review --base main` command with `--base review-base` (a local branch pinned at the Phase 0 commit) since this repo has no `main`/remote

## Not done — needs a decision or action from Ryan
1. **Real seed content.** Modules/resources/bonuses/testimonials now have a real admin UI to add them (`/admin/modules`, `/admin/bonuses`, `/admin/testimonials`) — but the tables are still empty. Nothing to actually show a student until that content is entered.
2. **Follow-up flagged, not fixed:** no way to resend the access-granted email once a grant already exists (both the webhook and admin manual-grant gate the email on "this call newly created the grant"). Worth a small admin "resend" action later.
3. **Supabase Auth SMTP** isn't yet pointed at Resend — plain login/resend emails currently ride Supabase's default mailer, not the properly-configured sending domain the spec calls out for deliverability at scale. Dashboard setting, not code.
4. **`access_grants` currently has a demo row** for `rynmiracle@gmail.com` (`source: manual_comp`, `granted_by: demo-script`) added so real screenshots could be taken — worth deleting or re-granting properly through the admin panel if you don't want it there.
5. **No reordering UI** for module/resource/bonus/testimonial display order — it's a plain number field you type in, not drag-and-drop. Deliberate scope cut, revisit if it becomes annoying with more content.

## Repo state
`unstuck-lms/`, 23 commits on `master`, pushed to [github.com/the-stewards/unstuck](https://github.com/the-stewards/unstuck), working tree clean. `handoff/` has a report for every phase plus the Codex review — that's the full paper trail if picking this back up later.
