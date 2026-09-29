# RSVP form + fill counter - replication review for Unstuck

Source: `DASHBOARD/rebel-affiliate` (Next.js 14, Neon Postgres, Netlify). Reviewed 2026-09-29, read-only.
Target: `DASHBOARD/unstuck-lms` (Next.js 16, Supabase, Resend, Stripe, Vercel).

## 1. How the Rebel form is built

**Files that matter**
- `app/[slug]/RsvpFlow.tsx` - the whole client flow: RSVP form -> offer -> games detail -> ambassador signup -> success. One file, step state machine (`useState<Step>`).
- `app/api/rsvp/route.ts` - the only write path for a form fill.
- `schema.sql` - `rsvps`, `affiliates`, `notifications`, `rate_limits`, `health_state`.
- `app/[slug]/page.tsx` and `app/embed/reveal/page.tsx` - server pages that fetch the count and pass it to `RsvpFlow` as `totalRsvpCount`.
- `netlify/functions/send-notifications.js` - flushes the outbox to Zapier/GHL every minute.
- `app/useIframeAutoResize.ts` - postMessage height to the host page.
- `lib/validate.ts`, `lib/rateLimit.ts`, `lib/db.ts`.

**The form (step 1)**: first name, last name, email, phone, SMS-consent checkbox, hidden honeypot field named `website`. CTA label is a prop. Client validation runs first, then POST `/api/rsvp` through `fetchWithTimeout` (12s abort, human error messages).

**The write path (server)**, in order:
1. Honeypot filled -> return `{ok:true}` silently (bot learns nothing).
2. Required-field + email validation, `smsConsent` must be true (server-side backstop, since the checkbox is client-only).
3. Rate limit and affiliate lookup run concurrently (`Promise.all`). Limit: 200/hour/IP, stored in Postgres so it holds across serverless instances.
4. Self-RSVP guard.
5. ONE statement: CTE inserts the RSVP and inserts a `notifications` row (outbox). No inline third-party call.
6. Unique index `rsvps_email_lower_idx` on `lower(email)` is the dedupe. Violation -> HTTP 409 with a clear message.

**The counter**
- Source of truth: `select count(*)::int from rsvps`, run server-side on every page render (`force-dynamic`), passed to the client as a prop. There is no counter table, no cache, no client fetch.
- Display: `useCountUp` animates 0 -> N over 900ms (ease-out cubic), skipped for `prefers-reduced-motion`. Pill has a pulsing dot.
- **Hidden below 100** (`totalRsvpCount >= 100`). A small number hurts social proof, so it just does not render.
- Note: the count shown does not update after the visitor submits; it is a page-load number.

**Embedding**: `condensed` variant restyles for a black host page and posts its height to the parent (`rebel-embed-resize` message) so the iframe never clips.

**Follow-on delivery**: outbox rows are claimed with `UPDATE ... FOR UPDATE SKIP LOCKED`, sent per target (Zapier, GHL) with independent `sent_at` / `ghl_sent_at`, max 5 attempts. A health-check function alerts on state change.

## 2. What to copy as-is (patterns)

1. **Outbox table for third parties.** Form response never waits on Zapier/CRM. Copy `notifications` + the flush function.
2. **Single-statement insert + outbox row** (CTE). One round trip, atomic.
3. **Server-side truth for the count**, passed as a prop. No counter to drift.
4. **Honeypot with fake success.**
5. **Unique index on `lower(email)`** and map the violation to a friendly 409.
6. **Server-side consent check**, not just HTML `required`.
7. **`fetchWithTimeout`** with retry-safe semantics (duplicates are rejected by the DB, never silently doubled).
8. **Count-up hook with reduced-motion guard**, and the "hide until impressive" threshold.
9. **Iframe auto-resize** if the form will live on a host page.

## 3. What must change for Unstuck

| Rebel | Unstuck | Why |
|---|---|---|
| Neon via `@neondatabase/serverless` `sql\`\`` | Supabase Postgres | Unstuck already runs on Supabase. Use the service-role client **server-side only** (`server-only`, like `lib/stripe.ts`). |
| Table is publicly writable through our own API only | Enable **RLS** on the new table with **no anon policies** | Supabase exposes tables through the anon key. Without RLS anyone could read every lead's email/phone. Insert and count only through server code. |
| `affiliate_id` required on every RSVP | Drop affiliates, or keep an optional `source` / `ref` text column | Unstuck has no affiliate program (yet). Keep `ref` if you want attribution later; costs nothing. |
| Self-RSVP guard, ambassador upsell steps | Remove | Not relevant. |
| Notifications -> Zapier/GHL via Netlify scheduled function | Same outbox table, flushed by a **Vercel cron** route (Unstuck already has `app/api/cron/nudge-stalled`) or by Supabase pg_cron | Netlify functions do not run on the Vercel deploy. Follow the existing cron route pattern and its tests. |
| Rate limit in `rate_limits` table | Same idea, new table in a migration | Serverless instances do not share memory. |
| Hard-coded event name/date/links in the component | Props / config | Rebel copy is baked into `RsvpFlow.tsx` ("Rebel Event 2027", date, `therebelevent.com` links). Unstuck version should take these as props from one config file. |
| Next 14 conventions | **Next 16**: `proxy.ts` (not middleware), `params` / `searchParams` are async. | `AGENTS.md` in the repo says to read `node_modules/next/dist/docs/` before writing code. The Rebel page code (`params: { slug: string }`) will not compile as-is on 16. |
| Tailwind-less CSS in `<style>` blocks with CSS vars | Unstuck uses Tailwind v4 + its dark theme | Rebuild the styling in the Unstuck design language, keep the structure. |

## 4. Gaps in the Rebel form I would NOT copy

1. **SMS consent is a bare boolean.** For Unstuck store the consent wording shown, a timestamp, and IP/user-agent. That is what you need if consent is ever challenged.
2. **Iframe `postMessage` uses target `"*"`.** Harmless for a height number, but the host-side listener should verify `event.origin`.
3. **Count is a full `count(*)` on every page view.** Fine at hundreds/thousands. If Unstuck traffic gets large, cache it (short revalidate) or keep a counter row.
4. **Threshold of 100 is hard-coded.** Make it a config value; Unstuck may launch with a small number.
5. **Global unique email across the whole event** is right for an event, but decide for Unstuck: one fill per email per *form*, so a second form later does not collide.

## 5. Proposed build for Unstuck (needs your sign-off, per the walkaway protocol)

Real build (8+ files, schema change) -> plan first.

1. Migration `0007_leads.sql`: `leads` (id, form_key, first_name, last_name, email, phone, sms_consent, consent_text, consent_at, ip, ref, created_at), unique index on `(form_key, lower(email))`, RLS on with no policies. Reuse/extend the outbox + rate-limit tables.
2. `lib/leads.ts` (server-only): validate, rate-limit, insert + outbox row in one statement, `getLeadCount(formKey)`.
3. `app/api/leads/route.ts`: the POST path with honeypot, consent check, 409 on duplicate. Tests alongside, matching the repo's Vitest style.
4. `components/LeadForm.tsx` + `useCountUp` + threshold prop. Server page passes the count.
5. Cron route to flush the outbox (Zapier/GHL/email), with tests.
6. Optional: embeddable version + iframe resize, following the existing `embed/checkout-widget.js` precedent.
7. Smoke test against the real Supabase project (row count from a live query), then deploy to Vercel.

## 6. Decisions needed before building

1. Where does the form live: a page on Unstuck, an embed on the Stewards site, or both?
2. What is the form for (waitlist, webinar RSVP, free lesson opt-in)? It sets the fields and the copy.
3. Where should new fills go: Zapier, GHL, Resend email, or all three?
4. Show the counter from day one, or only after a threshold (Rebel used 100)?
5. Use the live Supabase project for the smoke test, or a separate test project?
