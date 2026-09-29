# Final Report - Lead form widget (RSVP + fill counter)

**Status: Phases 0-7 complete. Phase 6 live smoke done (see phase-6-report-lead-form.md) including the confirmation email (delivered via Resend after Ryan supplied a working key). Not deployed, PR not yet opened.**

## What shipped (branch `feat/lead-form`, not merged, not deployed)
- `<div data-unstuck-lead="webinar"></div><script src=".../embed/lead-widget.js"></script>` script widget (survives BD's JS stripping); iframe fallback `/embed/lead/webinar` posting `unstuck-lead-resize` height.
- `POST /api/leads`, `GET /api/leads/count` (CORS open on these two only).
- Migration `0007_leads.sql` (unapplied): leads, lead_outbox, rate_limits, RLS with zero policies, `submit_lead` + `hit_rate_limit` functions (service_role only).
- Honeypot, server-side consent + validation, per-IP rate limit, 409 on duplicate email per form, consent wording + timestamp + IP + UA stored, confirmation email via Resend (best-effort), counter hidden below threshold (25, `data-min-count` override).

## Gates
72 tests pass (22 new), `next build` clean, tsc clean, eslint 0 errors. Widget verified visually in-browser (form, counter state, success state) with mocked API responses - NOT against the real database.

## Review
See `codex-review-lead-form.md` (subagent substitute for Codex; no P1; 3 P2 fixed; 2 decisions open).

## To finish (needs Ryan)
1. Apply `supabase/migrations/0007_leads.sql` in the Supabase SQL Editor (additive). Then Phase 6: real submit, live row count, counter, cleanup by id.
2. Set real event name/date in `lib/lead-forms.ts` (placeholder "Date to be announced" goes into live emails otherwise).
3. Decide on SMS consent as required + double opt-in (see review) before any texting is built.
4. Approve the Vercel deploy; the embed URLs only work on the live domain after that.
5. Follow-ups not built: Zapier/GHL outbox flush cron, admin view/CSV of leads, rate_limits pruning.
