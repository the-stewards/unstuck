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
