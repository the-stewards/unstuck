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
