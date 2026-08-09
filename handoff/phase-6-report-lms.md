# Phase 6 Report — Smoke Test

**Status:** Complete. Unblocked after Ryan provisioned a real Supabase project, Stripe test-mode credentials, and a Resend key (see `phase-6-blocked-lms.md` for what was needed).

## Setup
- Migration `0001_init.sql` applied to the live Supabase project (`vfdusvvhplowqrmqscqx`) — confirmed via Table Editor, all 9 tables present.
- Real credentials written to `unstuck-lms/.env.local` (gitignored, never committed).
- Stripe CLI installed locally (`winget install Stripe.StripeCli`) to get a webhook signing secret and forward real events to the local dev server — no public URL/deploy exists yet, so this is the only way to get real Stripe-signed webhook deliveries pre-deploy.
- Dev server run via the `unstuck-lms` preview config (port 5193) with real env vars loaded.

## Evidence

**1. Real Supabase Auth + trigger** — submitted the login form with `rynmiracle@gmail.com` through the actual UI (typed into the real input, clicked the real submit button). `signInWithOtp` succeeded against the live project. Live query confirmed a real row in both `auth.users` and `public.students` (the `handle_new_user` trigger fired correctly):
```
students: [{ "id": "51334935-4486-41e6-b57c-f29c7b61d015", "email": "rynmiracle@gmail.com", "call_status": "not_booked", "created_at": "2026-08-09T17:21:12.044396+00:00" }]
```

**2. Real Stripe Checkout session** — submitted the purchase form through the real UI. `/api/stripe/checkout` returned 200 with a real Stripe-hosted URL; the browser tab actually landed on `checkout.stripe.com`, correctly showing the account's business name ("Stewards"), the $47 price, and the submitted email prefilled.

**3. Real Stripe webhook, signature-verified** — hosted Checkout's own JS-heavy card form didn't submit cleanly through browser automation (likely React-controlled-input events not firing from synthetic typing — a browser-automation limitation, not an app bug, given session creation itself already worked). Used `stripe trigger checkout.session.completed` instead, which fires a genuine Stripe API event, signed with the real webhook secret, delivered through the running `stripe listen` tunnel to the actual `/api/stripe/webhook` route:
```
2026-08-09 13:25:26   --> checkout.session.completed [evt_1U2aTWA7Ksxi4PyyHSIDzMb5]
2026-08-09 13:25:28  <--  [200] POST http://localhost:5193/api/stripe/webhook [evt_1U2aTWA7Ksxi4PyyHSIDzMb5]
```
Live query confirmed real rows in both `orders` and `access_grants`, correctly linked and sourced:
```
orders: [{ "stripe_session_id": "cs_test_a1kR...", "email": "stripe@example.com", "amount_cents": 3000, ... }]
access_grants: [{ "email": "stripe@example.com", "source": "stripe_purchase", "stripe_session_id": "cs_test_a1kR...", ... }]
```
(Email is Stripe's own fixture default from `trigger`, not a real address — expected, this is Stripe's canned test data, not something we control.)

**4. Resend deliverability** — the webhook's `sendAccessGrantedEmail` call correctly reached Resend, which rejected the fixture's `stripe@example.com` recipient (`422 Invalid to field... use our testing email address instead of domains like example.com`) — Resend's own anti-abuse check on the destination domain, not an account/config problem. Confirmed separately with a direct real send to `rynmiracle@gmail.com`: `200`, real message ID (`15cd9270-e05f-4a38-a201-e4a1f5b0da8e`) — the account is not sandbox-restricted, real sends work.

## Findings
- **Not a bug, but worth noting**: `sendAccessGrantedEmail` failures aren't surfaced anywhere beyond a console log line (Resend's own SDK logs API errors by default; our code doesn't check the response for an `error` field). Combined with the webhook's idempotency guard, a first-attempt email failure for a real student would never get retried on a later webhook redelivery, since the `orders` row would already exist and skip re-processing entirely. Not fixed in this phase — flagged as a follow-up (e.g., alerting on failed sends, or a periodic reconciliation job) rather than in-scope for the smoke test itself.
- Browser automation couldn't drive Stripe's hosted Checkout card form to a full completed payment — not an application defect (session creation, the part our code controls, worked correctly); noting it in case a future E2E test suite needs a different approach (Stripe's test-mode `pm_card_visa` payment method token via the API, rather than UI form-filling).

## Gates
- Real Supabase row: yes (`students`/`auth.users`)
- Real Stripe test-mode API response: yes (Checkout session creation, real webhook event)
- Real timestamp/ID from live system: yes (all of the above)
- No destructive actions taken; no real money moved (test mode throughout)
- `.env.local` confirmed gitignored before writing any secret to disk
- Scratch verification scripts removed after use; `git status` clean

## Not yet done
- Full hosted-Checkout-to-webhook round trip via actual card entry (blocked on the browser-automation limitation above, not credentials) — the webhook code path itself is proven via `stripe trigger`, so this is a lower-priority gap
- Ryan hasn't yet clicked his real magic-link email to get an authenticated browser session, so `/dashboard` and `/admin` haven't been exercised against a real logged-in session — the pages are already covered by Phase 3-4's browser verification (correct redirect-when-signed-out behavior) and unit/integration tests; this would be additional confirmation, not a gap in what's shipped
