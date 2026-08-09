# Phase 6 — Blocked on Credentials

**Status:** Stopped per protocol stop rule ("real secret needed that wasn't in the env file").

Phases 0-5 are complete: scaffold, schema, data helpers, all UI (read + mutation), and a 28-test suite, all committed with clean gates. What's left needs things I can't create myself — provisioning a Supabase project, a Stripe account, or generating real API keys are all explicitly out of scope (see the build plan's stop rules and non-goals).

## What Phase 6 needs to actually run
A real magic-link request against a live Supabase project, and a real Stripe test-mode Checkout session + webhook event, verified via a live database query — that's the smoke-test bar from the protocol. None of that is fakeable; it needs:

1. **Supabase** — a project (free tier is fine for this). From Project Settings → API:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - Then run `supabase/migrations/0001_init.sql` against it (SQL Editor, paste-and-run is fine for a project this size)
   - One dashboard setting worth doing at the same time: point Supabase Auth's SMTP config at Resend, so magic-link emails don't ride the default Supabase mailer (this is what makes the "properly configured sending domain" requirement in the spec real — see `lib/notify.ts`'s comment)

2. **Stripe** — test mode is enough for Phase 6; switch to live keys only at real deploy:
   - `STRIPE_SECRET_KEY` (test)
   - A $47 Price object, for `NEXT_PUBLIC_STRIPE_PRICE_ID`
   - A webhook endpoint pointed at `<app-url>/api/stripe/webhook`, listening for `checkout.session.completed`, for `STRIPE_WEBHOOK_SECRET` — the Stripe CLI's `stripe listen --forward-to localhost:5193/api/stripe/webhook` works for local Phase 6 testing without a public URL yet

3. **Resend** — `RESEND_API_KEY` and a verified sending domain for `RESEND_FROM_EMAIL` (this is the SPF/DKIM/DMARC setup the spec flags as a scale requirement)

4. **Two small values only I know**: `ADMIN_EMAILS` (comma-separated — presumably yours and Chris's) and `NEXT_PUBLIC_BOOKING_URL` (booking tool isn't chosen yet per the spec's open items — a placeholder is fine for now)

All of these go in `unstuck-lms/.env.local` (gitignored, never committed) — `.env.example` documents every key with no values filled in.

## What I'd run the moment those exist
- `npm run dev` (or the existing `unstuck-lms` preview config, port 5193), request a magic link with a real address, confirm the Supabase `students` row and auth session
- A real Stripe test Checkout session end to end, confirm the webhook fires, confirm real `orders` and `access_grants` rows via a live query — that's the "real database row count from a live query" evidence the protocol requires
- Apply the migration and spot-check RLS actually blocks what it's supposed to (a second test account shouldn't be able to read another student's `progress` row, `access_grants` shouldn't be client-readable at all)

## Everything else is genuinely done and buildable further if you want more scaffolded ahead of Phase 6
If it's useful, I can keep going on things that don't need live credentials while you set these up — e.g. seed data for the 6 planned modules, the resources/bonuses/testimonials content once you have real copy, or a first pass at Netlify deploy config. Say the word.
