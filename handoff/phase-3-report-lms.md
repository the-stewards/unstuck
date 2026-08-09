# Phase 3 Report — Read-Only UI

**Status:** Complete

## What shipped
- Pages: `/login`, `/dashboard`, `/module/[id]`, `/purchase`, `/purchase/success`, `/admin` — all render real data through Phase 2 helpers. Forms/buttons are present but inert (marked with "wired in Phase 4" comments) — per protocol, Phase 3 is data rendering, not mutations.
- Components: `ModuleCard` (soft-lock — every module is a live link regardless of status, checkmark only on complete), `ProgressBar`, `DubbEmbed` (mirrors Dubb's own responsive embed markup as a plain iframe — no completion-event wiring, since none exists), `ResourceCard`, `BonusLock` (locked bonuses stay visible — that's the FOMO mechanic, never hidden), `TestimonialBlock`, `CtaBanner` (copy softens once `call_status` is `booked`/`completed`), `AppHeader`.
- `lib/course.ts` + `lib/admin-data.ts`: read helpers for modules, resources, bonuses, student bonus statuses, testimonials, order-by-session-id, and the admin student/progress listing.
- Single dark theme (no light-mode variant) — deliberate, fits the "private library" exclusivity framing from the spec; this app has no public-facing marketing surface for a light theme to matter on.

## Two real bugs found via build + browser verification (not just typecheck)
1. **`lib/stripe.ts` and `lib/notify.ts` instantiated their API clients at module scope.** `new Stripe(...)` / `new Resend(...)` at the top of the file throw immediately if the key env var is unset — which crashed `next build`'s route-data-collection step for `/api/stripe/checkout` and `/api/stripe/webhook` entirely. This isn't a Phase-6-credentials problem; it would have broken the build (and any cold Lambda/Netlify function start) even with real keys configured wrong or briefly unavailable. Fixed: both are now lazy singletons, only constructed on first actual use.
2. **`proxy.ts` had no error handling around the Supabase session-refresh call.** Found by loading `/login` in-browser: the page 500'd, and it turned out the *global* proxy (runs on every request per its matcher) was throwing before any page code ran. Confirmed via `preview_logs` and network requests, not just console output. This would have taken down every page — including ones needing no session, like `/login` and `/purchase` — on any session-refresh hiccup (misconfiguration, network blip, malformed cookie), not just before real credentials exist. Fixed: wrapped in try/catch; a failed refresh now just means the session doesn't get refreshed that request, not a site-wide outage.

## Browser verification
- `/login` and `/purchase`: loaded clean, 200 OK, zero console errors, correct copy rendered — confirmed via `get_page_text` and `read_network_requests` (screenshot tool errored on pane visibility, so text/network checks stood in).
- `/dashboard`, `/admin`, `/module/[id]`: correctly 500 without live Supabase credentials — this is expected and is exactly the Phase 6 blocker, not a new defect. `requireStudent()`/`requireAdmin()` need a real project to authenticate against.
- Added an `unstuck-lms` entry to `DASHBOARD/.claude/launch.json` (port 5193) so this project has a preview server going forward.

## Gates
- Typecheck: clean
- Lint: clean
- Build: clean (`next build` completes, correct route manifest — 6 static/dynamic pages + 2 API routes + proxy)
- `git status`: clean after commit
- Commit: `28a904e`

## Assumed
- No light-mode variant — single dark theme by design, not an oversight.
- Visual design is functional/clean, not a full Stewards brand-system pass (tokens, exact palette) — flagged as a follow-up if Ryan wants pixel-exact brand alignment before real students see it.
