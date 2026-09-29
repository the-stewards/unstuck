# Build Plan - Standalone Lead Form Widget (RSVP + fill counter)

## Goal
One embeddable lead-capture form (webinar RSVP by default) with a live fill counter, hosted by unstuck-lms and droppable on any page, including Brilliant Directories pages that strip inline JS. Pattern source: `rebel-affiliate` RSVP flow (see `rsvp-form-replication-review.md`).

## Embed strategy (the core decision)
BD strips `<script>` bodies and inline handlers (LEARNINGS 2026-07-26) but keeps `<script src>` (proven by `app/embed/checkout-widget.js`). So two embed modes off one backend:

1. **Script widget (primary):** `<div data-unstuck-lead="webinar"></div><script src="https://unstuck.stewards.loan/embed/lead-widget.js"></script>`. Builds the form inline in the host page (no iframe, no height problem), same precedent as the checkout widget. Multiple per page, idempotent init.
2. **Iframe page (fallback):** `/embed/lead/[formKey]`, posts its height to the parent. Only for hosts that allow neither. BD fixed-height iframe is the last resort.

Both call the same API. CORS is opened on the two lead routes only.

## Non-goals (v1)
- No Zapier/GHL flush (outbox table is written, flush target is a later change order once a webhook URL exists)
- No affiliate/ref program (optional `ref` text column only)
- No admin UI for leads (view in Supabase; CSV export later)
- No live-updating counter after submit (page-load number, same as Rebel)
- No deploy without explicit go-ahead

## Acceptance criteria
- Paste the script snippet on any page: form renders, styled to Unstuck brand (cream/orange/charcoal, Barlow Condensed + Frank Ruhl Libre, matching checkout widget)
- Fields: first name, last name, email, phone, SMS consent checkbox (+ honeypot). Server re-validates everything, consent enforced server-side
- Submit -> row in `leads` + outbox row in one atomic step; success state with confirmation email via Resend (best-effort, never blocks the response)
- Duplicate email on same form -> 409 with a human message; different form_key does not collide
- Counter: server-side `count(*)` per form_key, animated count-up (reduced-motion safe), hidden below `minCount` (default 25, overridable via `data-min-count`)
- Consent record stored: exact wording shown, timestamp, IP, user-agent
- Rate limit per IP, honeypot fake-success, RLS on with zero anon policies (leads never readable via the anon key)
- Tests: validation, honeypot, consent backstop, duplicate 409, rate limit, counter threshold, CORS headers, widget JS served
- Smoke: real submission against live Supabase, row count from a live query, then test rows deleted (by exact id only)

## Data model - `supabase/migrations/0007_leads.sql` (additive only)
- `leads`: id, form_key, first_name, last_name, email, phone, sms_consent, consent_text, consent_at, ip, user_agent, ref, created_at. Unique index `(form_key, lower(email))`
- `lead_outbox`: id, lead_id, event, payload jsonb, created_at, sent_at, attempts (written now, flushed later)
- `rate_limits`: key, window_start, count (reuse if one already exists in 0001-0006, else new)
- RLS enabled on all three, no policies (service-role only)
- Atomic insert via a `submit_lead(...)` SQL function (security definer, service-role execute only) so lead + outbox is one round trip, mirroring Rebel's CTE

## Files
- `supabase/migrations/0007_leads.sql`
- `lib/leads.ts` (server-only: validate with zod, rate limit, submit, `getLeadCount`)
- `lib/leads.test.ts`
- `app/api/leads/route.ts` (POST + OPTIONS) and `route.test.ts`
- `app/api/leads/count/route.ts` (GET + OPTIONS, short cache) and test
- `app/embed/lead-widget.js/route.ts` (script widget, config per `data-*`: form, cta, title, min-count)
- `app/embed/lead/[formKey]/page.tsx` + `components/LeadForm.tsx` + `useIframeAutoResize` (iframe fallback; async params per Next 16)
- `lib/lead-forms.ts` (config: form_key -> copy, consent wording, event name/date, threshold)
- `lib/notify.ts` (add `sendLeadConfirmationEmail`, checks Resend `error`)
- `handoff/` phase reports + build log

## Phases (commit per phase, gates between)
- P0 Prepare: create branch `feat/lead-form`, commit the pending `vitest.config.mts` alias fix separately, read Next 16 route-handler + CORS docs in `node_modules/next/dist/docs/`
- P1 Schema: 0007 migration file only (not applied)
- P2 Helpers: `lib/leads.ts`, config, notify addition
- P3 Read-only: count route, widget renders form shell + counter, iframe page renders
- P4 Mutation: POST route wired, widget submit, success/error/duplicate states
- P5 Tests (incl. one regression test per bug found)
- P6 Smoke: apply 0007 to live Supabase (additive DDL, needs your OK at that moment), real submit via the widget on a local test HTML page, live row count, cleanup
- P7 Codex review, max 2 cycles
- P8 Final report, PR opened not merged

## Stop rules specific to this build
- No DROP/DELETE-without-WHERE/TRUNCATE; migration is additive
- No real emails to real people: confirmation email during tests goes to rynmiracle@gmail.com only
- No deploy to Vercel until you say so; CORS `Access-Control-Allow-Origin` stays `*` only on the two lead routes
- Don't touch checkout route/widget, Stripe, auth, or other projects

## Assumptions (change any before lock-in)
1. Purpose: webinar RSVP; form_key `webinar` seeded in `lib/lead-forms.ts`, event name/date placeholders you fill in
2. Destination v1: Supabase + Resend confirmation email to the registrant. Zapier/GHL is a follow-up
3. Counter threshold default 25
4. Live Supabase project for the smoke test (the only one; cleanup by id)
5. Branding matches the existing checkout widget colors/fonts
