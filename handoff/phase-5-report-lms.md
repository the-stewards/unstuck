# Phase 5 Report — Tests

**Status:** Complete

## What shipped
Vitest (`node` environment, `vite-tsconfig-paths` for the `@/*` alias). `"server-only"` is aliased to an empty module in `vitest.config.mts` — Next's bundler swaps that package for a no-op in server bundles and a throwing shim in client bundles, but Vitest runs outside that pipeline entirely, where the real package throws unconditionally on import.

**Unit** (`lib/progress.test.ts`, `lib/access.test.ts`):
- `computeStatus()` around the 95% threshold, negative/zero watch time, and the `durationSeconds = 0` edge case (must never report `complete` for a module with no duration set)
- `grantAccess()` idempotency: new email grants; an existing row skips the insert entirely; a `23505` unique-violation on insert (two calls racing — e.g. a retried webhook) is treated as already-granted, not an error; any other insert error still throws

**Integration** (`app/api/stripe/webhook/route.test.ts`, `app/actions/admin.test.ts`):
- First webhook delivery grants access and sends one email; a retried delivery (`orders.insert` returns `23505`) grants nothing and sends nothing — the actual idempotency contract Stripe's retry behavior requires
- Non-admin and signed-out callers are rejected; `grantManualAccess` doesn't send a second email when access already exists — the spec's "always checks for an existing purchase first" requirement, verified as behavior rather than just described

**Regression** — one test per real bug found during Phases 3-4, all four of which were runtime-only failures that typecheck, lint, and build each passed cleanly on:
- `lib/stripe.test.ts`, `lib/notify.test.ts` — importing either module without its API key set must not throw
- `proxy.test.ts` — Supabase client creation throwing must not stop `proxy()` from returning a response
- `app/actions/auth.test.ts`, `app/api/stripe/checkout/route.test.ts` — both must degrade to a graceful result instead of throwing when their downstream client is unavailable

28 tests across 9 files, all passing.

## What's intentionally not covered
- No test hits a real Supabase/Stripe/Resend endpoint — everything is mocked. Real-system behavior (RLS policies actually enforcing what the migration says, a real webhook signature verifying, a real magic link landing) is Phase 6's job, not Phase 5's.
- UI components aren't unit-tested (no React Testing Library setup) — they were verified by hand in-browser during Phases 3-4, which is where the two `proxy.ts`/action-throwing bugs actually surfaced. Adding component tests now would be testing implementation rather than behavior for markup this simple; not worth the setup cost for this build.

## Gates
- Typecheck: clean
- Lint: clean
- Build: clean — confirmed `*.test.ts` files inside `app/` do not get picked up as routes (Next only recognizes exact file names like `route.ts`, `page.tsx`)
- Tests: 28/28 passing
- `git status`: clean after commit
- Commit: `0dcea6b`
