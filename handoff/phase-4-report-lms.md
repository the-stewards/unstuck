# Phase 4 Report — Mutation UI

**Status:** Complete

## What shipped
- `LoginForm` — magic-link request via `requestMagicLink`, plus self-serve resend (spec requirement: reduce "I can't log in" support load). Keeps the submitted email in local state so resend doesn't require retyping.
- `PurchaseButton` — posts to `/api/stripe/checkout`, redirects to the returned Checkout URL on success. `/purchase` now reads `?email=` to prefill from the external webinar-registration step.
- `ProgressTracker` — the actual v1 completion heuristic: a 15-second interval that only counts elapsed time while `document.visibilityState === "visible"`, sending `initialWatchPositionSeconds + elapsed` to `updateProgress` each tick. Not rendered once a module is already `complete`, so finished modules don't keep writing.
- `AdminGrantForm` — check-then-grant flow; always surfaces an existing grant (source + date) before offering the "Grant access" button, matching the spec's "no accidental double-grant" requirement directly.
- `CallStatusSelect` — inline per-row toggle on `/admin` for `not_booked` / `booked` / `completed`.

## Two more real bugs, same class as Phase 3
Both `requestMagicLink` and the Stripe checkout route declared implicit "always returns a result, never throws" contracts that their callers depend on — `LoginForm` awaits the action directly with no try/catch of its own, `PurchaseButton` always calls `response.json()` on the fetch result. Neither actually honored that contract: an underlying Supabase or Stripe exception propagated as an unhandled error, which Next renders as its generic full-page error boundary (for the server action) or as non-JSON output that breaks `.json()` (for the route).

Caught by literally typing an email into the running app and clicking submit — not by typecheck or lint, both of which were clean throughout, and not by `next build` either (this is a runtime-only failure mode). This is exactly why the protocol asks for build + browser verification, not just green typecheck.

Fixed by wrapping both in try/catch with a generic user-facing fallback message. Verified in-browser both before and after: before the fix, submitting either form produced Next's "This page couldn't load" boundary; after, both show their normal inline error state ("Something went wrong, try again in a moment" / "Could not start checkout, try again in a moment").

## Gates
- Typecheck: clean
- Lint: clean
- Build: clean
- Browser verification: `/login` and `/purchase` form submissions confirmed to degrade gracefully without real Supabase/Stripe credentials, via `read_page` (find the interactive elements) → `computer` (click + type) → `get_page_text` (confirm the resulting state)
- `git status`: clean after commit
- Commit: `6c267d4`

## Assumed
- Resend copy/flow reuses the same `requestMagicLink` action rather than a separate endpoint — the spec just asks for a self-serve resend, not a functionally distinct one.
- `/purchase`'s email field is user-editable even when prefilled from `?email=` — a webinar-registration email typo shouldn't lock someone out of fixing it before paying.
