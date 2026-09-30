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

## Revision 2026-09-30 - step 2 moves to its own page
Ryan: step 2 must live on a separate page (with a VSL above the offer). Step 1 redirects there after the RSVP; declining converts the step 2 widget to save-to-calendar.
- Step 1 widget: optional `data-next-url` (absolute http(s) only) -> redirect to `<url>?lid=<lead id>`. No name/email/phone in the URL. Without it, step 1 shows the calendar step in place. Inline upsell removed from step 1.
- Step 2 widget: `<div data-unstuck-upsell="webinar">` (same script). Reads `?lid=` (or `data-lid`). Yes -> POST /api/stripe/checkout {leadId, from}; No thanks -> in-place calendar step. Without a lid it asks for an email.
- `POST /api/leads` now returns `leadId`. Checkout route resolves `leadId` -> email server-side (UUID-validated, unknown id -> 400), ignoring any client email when a leadId is sent.
- Consent text shortened per Ryan: "I agree to receive text and email reminders for Unstuck." (STOP/rates sentence removed at his direction).
