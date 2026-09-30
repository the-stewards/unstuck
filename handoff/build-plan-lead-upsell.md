# Plan addendum - RSVP > $47 upsell > save to calendar

Scope change requested by Ryan 2026-09-29 (after the base lead form shipped). Flow: RSVP form -> $47 UNSTUCK LMS upsell -> save to calendar. Declining the upsell goes straight to the calendar step. Buying goes to Stripe Checkout, whose success page then shows the calendar step.

## Design
- Widget steps: form -> (form.upsell present) upsell card -> calendar card. "No thanks" -> calendar. "Yes" -> POST /api/stripe/checkout {email, from: "webinar"} -> top-level redirect to Stripe.
- Checkout route: optional `from` (only a known lead-form key is echoed) appended to success_url as `&from=`. /purchase/success renders `CalendarButtons` when `from` is set.
- Calendar: Google Calendar template link (weekly RRULE, ctz America/New_York) + `.ics` (GET /api/leads/calendar, VTIMEZONE, weekly Thursday, 15-min alarm). `lib/lead-calendar.ts` computes the next Thursday 12:00 ET server-side, zone-safe.
- All copy (upsell bullets, price, calendar labels) and the schedule live in `lib/lead-forms.ts`.

## Non-goals
Live Stripe keys (production Stripe is TEST mode - see final report), join-link email content, Zapier/GHL.
## Assumptions
Eastern time, 60-minute session, upsell bullets derived from the LMS handoff (6 modules, resources, bonuses) - edit in config.
