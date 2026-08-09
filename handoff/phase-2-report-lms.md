# Phase 2 Report — Data Helpers and Server Actions

**Status:** Complete

## What shipped
- `lib/supabase/client.ts` / `server.ts` / `admin.ts` — browser, per-request server (cookie-backed), and service-role clients
- `proxy.ts` — Next 16's replacement for `middleware.ts`, refreshes the Supabase session cookie on every request (long-lived session requirement)
- `lib/access.ts` — `grantAccess({ email, source, grantedBy, stripeSessionId })`, the single unified entry point for both access paths. Idempotent two ways: check-then-insert, plus `unique(email)` as a DB-level fallback for a race (e.g. a retried Stripe webhook landing concurrently with something else)
- `lib/progress.ts` — v1 time-elapsed completion heuristic (`watch_position_seconds` vs. `modules.duration_seconds` at a 95% threshold), monotonic position (never regresses on re-open), course-wide progress percentage
- `lib/notify.ts` — the post-access-grant email: generates a Supabase magic link via `auth.admin.generateLink` and sends custom receipt/welcome copy through Resend, distinct from the plain login-screen resend
- `lib/admin.ts` — `ADMIN_EMAILS` allowlist check
- `lib/session.ts` — `requireStudent()` / `requireAdmin()` guards for Phase 3 pages
- `app/actions/{auth,progress,admin}.ts` — server actions: magic-link request, progress update, manual grant (with existing-purchase check baked in), call-status toggle
- `app/api/stripe/checkout/route.ts` — creates the $47 Checkout session
- `app/api/stripe/webhook/route.ts` — signature-verified (`stripe.webhooks.constructEvent` on the raw body), idempotent via `orders.stripe_session_id` unique constraint — a duplicate delivery skips both the grant and the email

## Problem hit and how it was resolved
Parameterizing all three Supabase clients with the hand-written `Database` type from Phase 1 broke type inference on `.insert()` and `.eq().single()` chains — every row came back typed `never`. Isolated it to a reproducible minimum: even a trivial 2-table schema breaks against this project's installed `@supabase/supabase-js@2.112` + `typescript@5.9`, tracing into a `RejectExcessProperties`-based `insert()` signature in the bundled `postgrest-js` types. Confirmed it's not a mistake in the schema shape (matches Supabase's own codegen convention) by testing the identical pattern with the generic removed — it typechecks clean.

**Decision:** ship without the `Database` generic on any client for now. Type safety moves from "the client enforces it" to "our helper functions declare and check it" — every Supabase call already lives inside a `lib/` function with an explicit typed signature, and the trickiest destructuring points (`lib/progress.ts`, `app/actions/progress.ts`) got explicit casts against the domain interfaces. Documented directly in `lib/types.ts` with a pointer to revisit once a real Supabase project exists and `supabase gen types typescript` output can be diffed against it — if generated types hit the same wall, that's a version/upstream issue worth its own investigation, not more time spent guessing here.

## Design decisions worth flagging
- Route protection (auth + access-grant check) lives in `lib/session.ts`, called from page/layout Server Components in Phase 3 — not in `proxy.ts`. Proxy's only job is session-cookie refresh (Supabase's own recommended split); running a DB query gate on every request including static assets would be wasteful.
- Manual-grant and Stripe-webhook paths both funnel through the same `grantAccess()` + `sendAccessGrantedEmail()` pair — there is no separate manual-grant email path.

## Gates
- Typecheck: clean
- Lint: clean
- `git status`: clean after commit
- Commit: `dd74fe3`
- (Build gate not required until Phase 3 per protocol)

## Assumed
- Plain login-screen magic-link/resend uses Supabase's own auth email (configured to send via Resend SMTP at the dashboard level once a project exists) rather than a fully custom send path — only the post-access-grant email is custom-composed, matching the spec's distinction between "arrives fast, standard login" vs. "doubles as receipt/welcome."
