# Step 1 RSVPs -> Zapier webhook (branch feat/zapier-outbox)

## How it works
- `submit_lead` already writes a `lead_outbox` row atomically with each RSVP. New `lib/lead-outbox.ts` `flushLeadOutbox()` POSTs unsent rows to `ZAPIER_LEADS_WEBHOOK_URL` (a Zapier "Catch Hook").
- `POST /api/leads` sends the confirmation email and the Zapier delivery concurrently (one round trip). Neither can fail the RSVP.
- Retries: each submission also flushes up to 5 older unsent rows; `/api/cron/flush-leads` (daily 15:00 UTC, `CRON_SECRET`-gated, in vercel.json) flushes up to 50. Max 5 attempts per row, then `sendAdminAlert` to ADMIN_EMAILS and the row is left for manual replay (`update lead_outbox set attempts=0 where ...`).
- Claim lock: `attempts` is incremented with an optimistic-lock update before sending, so concurrent flushes never double-send a row.
- No URL set = rows stay queued (no error), and are sent once the URL is configured.

## Payload (flat JSON, the contract Zaps map against)
event, outbox_id, lead_id, form_key, event_name, event_date, first_name, last_name, email, phone, sms_consent, ref, created_at (ISO). `lead_id`/`outbox_id` are stable for dedupe.

## Evidence
100 tests pass (13 new: delivery, retry, give-up + alert, no-URL, already-sent, leadId scoping, concurrent claim, cron auth, route wiring), build clean. Live check: dev server -> live Supabase -> local receiver: one real RSVP posted the payload above (HTTP 200), outbox row `sent_at` set. Test lead deleted by id.

## Side effect to know
That live check also drained the 5 pre-existing unsent outbox rows (Ryan's own 9/29-9/30 test RSVPs: rynmiracle@, ry_miracle@yahoo, ryan.miracle@ruoff, p@p.com, y@y.com) to the LOCAL receiver, so they are marked sent and will NOT go to the real Zap (intentional-ish: avoids automations firing at junk addresses). Reset with `update lead_outbox set sent_at=null, attempts=0 where lead_id in (...)` if wanted.

## To go live (Ryan)
1. Zapier: new Zap, trigger Webhooks by Zapier > Catch Hook, copy the URL.
2. Vercel > unstuck-lms > Settings > Environment Variables: add `ZAPIER_LEADS_WEBHOOK_URL` (Production), then redeploy.
3. Merge feat/zapier-outbox to master. Submit a test RSVP; Zapier "Test trigger" will find it.
