# Report - upsell + calendar flow (branch feat/lead-upsell)
Built: upsell card, calendar step (Google + .ics), Stripe success-page calendar block, checkout `from` param, `/api/leads/calendar`, `lib/lead-calendar.ts`.
Gates: tsc clean, 84 tests pass (12 new: next-occurrence incl. DST/timezone edge cases, Google URL, ICS structure/escaping/folding, calendar route, checkout `from` allowlist), `next build` clean. Visually verified all three steps in-browser (fake submit).
Not verified: a real Stripe redirect from the widget on production (production Stripe is in TEST mode: live payments need live keys/price/webhook - a real-money change order). Pre-existing lint errors in AdminGrantForm/PurchaseSuccessStatus (unescaped apostrophes) are not from this branch.
Open: join link (`calendar.joinUrl` in lead-forms.ts), upsell copy sign-off, deploy (merge feat/lead-upsell to master).

## Revision 2026-09-30 (step 2 on its own page)
87 tests pass, build clean. Verified in-browser with a two-page mock: step 1 submit redirects to step2?lid=<uuid>, Yes redirects to checkout URL, No thanks converts to calendar step (Google + .ics links). Embeds:
Step 1: `<div data-unstuck-lead="webinar" data-next-url="https://YOUR-VSL-PAGE"></div>` + `<script src="https://unstuck.stewards.loan/embed/lead-widget.js"></script>`
Step 2 (under the VSL): `<div data-unstuck-upsell="webinar"></div>` + the same script tag.
Not built: iframe fallback for step 1 does not take data-next-url; hosted VSL page (Ryan builds the VSL page himself).

## Revision 2 2026-09-30 (three separate widgets)
87 tests pass, build clean. Browser-verified: step 2 decline -> /calendar/webinar (calendar widget); /calendar/webinar?purchased=1 shows the payment-received note. Not verified live: an actual Stripe payment returning to the calendar page (production Stripe is TEST mode; return URL covered by a unit test).
Embeds (all use `<script src="https://unstuck.stewards.loan/embed/lead-widget.js"></script>` once per page):
1. `<div data-unstuck-lead="webinar" data-next-url="https://STEP2-PAGE"></div>`
2. `<div data-unstuck-upsell="webinar"></div>` (under the VSL)
3. `<div data-unstuck-calendar="webinar"></div>`

## Revision 3 2026-09-30 (Stripe Payment Link + real page URLs)
- Step 2 "Yes" -> Stripe Payment Link https://buy.stripe.com/fZu28qb7kgDO7arec60Fi01 with `client_reference_id=<lead id>` (no PII in URL). No email box needed for this path; the link collects it. Existing webhook (`checkout.session.completed`, uses customer_details.email) grants access for Payment Link purchases too.
- Step 3 page = https://www.stewards.loan/unstuck.save (calendarPageUrl). Step 2 page = https://www.stewards.loan/starterkit (used as step 1's data-next-url).
- REQUIRED in Stripe dashboard (not doable from code): Payment Link > After payment > "Don't show confirmation page" > redirect to https://www.stewards.loan/unstuck.save?purchased=1 so buyers return to the calendar page with the payment-received note.
- Caveat: webhook grants access on ANY checkout.session.completed on the account (pre-existing), not just this product.
89 tests pass, build clean; verified in-browser that Yes goes to the link with client_reference_id.
