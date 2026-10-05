# Homeowner qualifying question + split routing (branch feat/homeowner-question)

Status: code complete and verified locally; NOT merged or deployed. Blocked on applying migration 0008 to the live Supabase project (the auto-mode check refused my attempt to confirm Supabase's "destructive operations" warning for `drop function`; leaving that production DDL to Ryan).

## What changed
- Widget: required radio group `homeowner_status` (fieldset/legend, native required validation) after phone, before the SMS checkbox. Options/legend come from server config (`homeownerQuestion` in lib/lead-forms.ts).
- Routing after the RSVP saves: `owner_central_ohio` -> existing flow (data-next-url, i.e. /starterkit -> /unstuck.save). `renter` / `outside_area` -> `registeredPageUrl` (https://www.stewards.loan/unstuck.registered), skipping the homeowner upsell. Everyone is registered, emailed and sent to Zapier the same way.
- API: `homeowner_status` validated against the three values (unknown value -> 400). Missing value is accepted and stored NULL so a widget script cached before this change can't lose RSVPs.
- DB: migration 0008 adds `leads.homeowner_status` (CHECK-constrained), index, and a new `submit_lead` (extra trailing param with default) that also puts `homeowner_status` in the outbox payload; drops the old 10-arg overload (a second overload would make PostgREST calls ambiguous).
- Zapier payload gains `homeowner_status`.
- Widget never calls fbq; Lead is fired only by the BD page it lands on (test enforces this).

## Verified locally
119 tests pass, build clean. In-browser (mocked API): question renders, submit without an answer is blocked ("Please select one of these options") and fires no request, renter -> /unstuck.registered, owner -> /starterkit?lid=...

## DEPLOY ORDER (important)
Apply 0008 FIRST, then merge. New code calls submit_lead with `p_homeowner_status`; against the current 10-arg function every RSVP would fail.

## BD-side (not code)
Create /unstuck.registered as a copy of /unstuck.save; pixel base code (init + PageView) only, no `fbq('track','Lead')`; noindex in the page SEO settings.

## Update 2026-10-05: DEPLOYED
Migration 0008 applied by Ryan via Supabase's assistant (verified: column present; single 11-arg submit_lead). Merged to master (362411e) and deployed. Live API check with +alias test emails: owner/renter/outside_area stored correctly, no-answer stored NULL (still registers), bad value -> 400, all 4 got the confirmation email and were delivered to Zapier with homeowner_status in the payload. Test leads deleted by id. NOTE: those 4 test RSVPs DID reach the real Zap (cannot be recalled) - delete them from any downstream sheet/CRM.
Remaining: create /unstuck.registered in BD (copy of /unstuck.save, pixel PageView only, noindex), then pixel acceptance tests 4-6.
