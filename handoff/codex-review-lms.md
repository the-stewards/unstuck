# Codex Review — unstuck-lms (Phases 1-6)

Run via `codex review --base review-base` (a local branch pinned at the Phase 0 scaffold commit — this repo has no `main`, everything was built and committed directly to `master`). `codex login status` showed an existing ChatGPT-authenticated session in this environment; no credentials were provisioned for this specifically.

## Findings

**[P1] Restrict course-content policies to paid students** — `supabase/migrations/0001_init.sql:62-63`
> Any user who requests a magic link becomes authenticated, and this policy then lets them query every module directly through the public Supabase API without an `access_grants` row. The equivalent authenticated-only policies on resources, bonuses, and testimonials have the same exposure, bypassing the server-side `requireStudent()` gate; make these policies verify the authenticated user's email has access.

**[P1] Do not mark webhook processing complete before granting access** — `app/api/stripe/webhook/route.ts:58-64`
> The order row is committed before `grantAccess()` and email delivery finish. If either later operation throws, Stripe retries the webhook, but the retry encounters the unique order row and skips the entire block, permanently leaving a paid customer without access or without their delivery email. Persist an explicit processing state or perform the access grant atomically/idempotently before treating the order collision as a completed delivery.

**[P2] Check the error returned by Resend** — `lib/notify.ts:52-57`
> Resend reports API rejections such as an invalid sender or rejected recipient through the resolved response's `error` field rather than necessarily rejecting the promise. Ignoring that response makes this function report successful delivery, so admin grants and Stripe webhooks can return success even though no login email was sent; inspect the result and throw when `error` is present.

## Triage

Both P1s are real and confirmed correct:

1. **RLS gap** — verified. `auth.role() = 'authenticated'` is true for anyone with a valid session, and `requestMagicLink` (correctly, per spec) doesn't check access before sending a login link — so requesting a magic link is enough to get a Supabase session, and RLS as written lets that session read every module/resource/bonus/testimonial directly via the Supabase REST API, bypassing `requireStudent()` entirely since that gate only exists in Next.js Server Component code, not the database. This is the exact "RLS as defense-in-depth, not just app-layer gating" gap. **Fix: P1, applying.**

2. **Webhook fulfillment ordering** — verified, and worse than the finding states: the *email* half has the same problem even when access grants correctly. Traced the actual failure mode: `orders.insert` (the dedup gate) happens before `grantAccess`/email; if either of those throws after the order row is committed, a Stripe retry hits the order's unique constraint and skips the entire block — including a case where `grantAccess` itself already succeeded but the email failed, since retry treats "order exists" as "already handled" and never re-attempts the email. **Fix: P1, applying** — reordering so the idempotent, important operation (`grantAccess`, already dedupes via `access_grants`) happens first, and the order insert becomes a best-effort bookkeeping write last, not a gate.

3. **Silent Resend failures** — verified, `sendAccessGrantedEmail` never inspects `.emails.send()`'s `{data, error}` response. **Fix: P2, applying.**

## Fixes applied
- `supabase/migrations/0002_restrict_content_to_granted.sql` — new migration adding a `security definer` `public.has_access(text)` helper (queries `access_grants`, which itself stays policy-free/service-role-only) and rewriting the `modules`/`resources`/`bonuses`/`testimonials` SELECT policies to require it, on top of the existing `authenticated` check.
- `app/api/stripe/webhook/route.ts` — reordered: `grantAccess()` (idempotent) runs first; the email send is wrapped in try/catch (a failure is logged loudly but doesn't turn the response into a 500 — retrying wouldn't fix it anyway, since a retry would skip `grantAccess` too now that the grant already exists); the `orders` insert moved last as pure bookkeeping, with a non-unique-violation failure there logged but not blocking the 200 response, since access was already correctly granted by that point.
- `lib/notify.ts` — `sendAccessGrantedEmail` now checks the Resend response's `error` field and throws if present, instead of treating every call as successful.
- Tests updated/added: webhook route tests cover the new ordering (grant succeeds even if the order bookkeeping insert fails; grant succeeds and returns 200 even if the email send throws) and `lib/notify.test.ts` covers the Resend-error-throws case.

## Not fixed (flagged as follow-up, out of scope for this cycle)
- There's still no way to *resend* the access-granted email once a grant already exists — both the webhook and the admin manual-grant action gate the email on "this call newly created the grant." A student whose first email genuinely failed to send has no automated path to a retry; the admin would need direct Supabase/Resend access to resend manually today. Worth a small "resend access email" admin action later, but that's new functionality, not a P1/P2 fix.
- Migration `0002` needs to be run against the live Supabase project the same way `0001` was (SQL Editor, paste-and-run) — I can't execute DDL against it directly (no Postgres connection string/Management API token, only the REST-facing service-role key).
