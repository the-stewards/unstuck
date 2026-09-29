# Independent review - lead form (Phase 7)

Codex CLI is not installed on this machine after the reset (installing/authing a global tool was not done unprompted), so a fresh-context Claude subagent stood in as the second reviewer. Read-only, nothing executed. **No P1.**

## Fixed (P2, contained)
- **Consent record could differ from what the visitor saw** (cached form meta / long-open page, then wording edited). Widget now sends the exact consent text it displayed; server rejects with 409 "refresh and try again" unless it equals the current wording. Tests added.
- **Non-JSON edge error (502/413 HTML) surfaced as a JSON parse error** in the widget. Now falls back to a generic message.
- **Shared `lead:unknown` rate-limit bucket** would lock out all visitors after 60 fills when no client IP header exists (local dev, non-Vercel host). Rate limit is skipped when IP is unknown.

## Not fixed - decisions for Ryan / counsel
1. **No double opt-in.** Anyone can submit someone else's email/phone: the victim gets a confirmation email and a row is stored with `sms_consent=true`, `consent_at`. Do NOT treat `sms_consent` as verified consent when the outbox flush / any SMS sending is built. Fix when SMS is wired: confirm by reply-YES or link before texting.
2. **SMS consent is a required condition of registering** (same as the Rebel form). TCPA guidance generally says consent should not be a condition. Have counsel look before launch, or make phone/consent optional.
3. Duplicate-email 409 reveals list membership (enumeration oracle). Accepted, low severity.

## Noise / accepted
Body-size check is chars not bytes; plus-address variants not deduped; outbox cascades with lead; `rate_limits` rows never pruned (one row per IP); failed submits consume rate budget; timeout-after-insert retry gets 409; resize postMessage targets `*` (height number only); `eventDate` placeholder is TODO-marked.

## Verified correct by reviewer
plpgsql (no column/variable ambiguity, RETURNING, make_interval), `lower(email)` index matches stored value, 23505 -> PostgREST `error.code` mapping, revokes/grants + `search_path` on both security definer functions, RLS on with no policies, atomic rate-limit upsert, widget uses textContent (no XSS), email escapes all interpolations, template-literal escapes.
