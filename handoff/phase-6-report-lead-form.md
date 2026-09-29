# Phase 6 Report - Live smoke test (lead form)

**Status: complete for the database/API path. Confirmation email NOT verified (see below).**

Migration `0007_leads.sql` applied to the live Supabase project `unstuck-lms` (`vfdusvvhplowqrmqscqx`) via the SQL Editor ("Success. No rows returned"). Comment lines were trimmed in the pasted copy; statements are identical.

## Evidence (live, 2026-09-29)
- Tables exist: `leads`, `lead_outbox`, `rate_limits` all HTTP 200 via service-role REST (were 404 before).
- Anon key: `rpc/submit_lead` -> `42501 permission denied for function submit_lead`. Anon `GET /leads` -> `[]` both before and WITH a row present (RLS, no policies).
- Real `POST /api/leads` (dev server on 5193 -> live DB): `{"ok":true}` HTTP 200. Live row: `id 109d1383-f723-4163-8c02-998598fc02d2`, form_key `webinar`, sms_consent true, consent_at `2026-09-29T21:23:40.94055+00:00`, ip `203.0.113.77`. Matching `lead_outbox` row (`cb68493c-...`, event `new_lead`, full payload).
- Duplicate email -> HTTP 409 "already reserved a seat". Stale consent wording -> HTTP 409 "refresh and try again" (no insert).
- `rate_limits` row `lead:203.0.113.77` count 2 (first submit + duplicate; stale-consent rejected before the limiter, as designed).
- `GET /api/leads/count?form=webinar` -> `count: 1` after the submit, `0` after cleanup.
- Cleanup: deleted lead `109d1383-...` (outbox cascaded) and rate_limit key `lead:203.0.113.77` by exact id/key. Final: leads `[]`, lead_outbox `[]`, rate_limits `[]`.

## Not verified
- **Confirmation email.** The `RESEND_API_KEY` in local `.env.local` (36 chars, `re_` prefix) is rejected by Resend's API ("API key is invalid"), so the local send could not be proven. The route swallows email failures by design (the lead is saved), which is why the submit still returned 200. Check the key (rotated/revoked?) and that the production Vercel env has a working one. Existing flows (`sendAccessGrantedEmail`) use the same key.
- Widget submit from a real browser against the live DB (widget was verified visually with mocked responses; the API it calls is now proven live).
