# Phase 0 Report — Prepare

**Status:** Complete

## What shipped
- Next.js 16.3.0 App Router scaffold (TypeScript, Tailwind v4, Turbopack default bundler, ESLint 9 flat config) via `create-next-app`
- Dependencies installed: `@supabase/supabase-js`, `@supabase/ssr`, `stripe`, `resend`, `zod`, `@netlify/plugin-nextjs`
- `.env.example` documenting all required keys (Supabase, Stripe, Resend, app URL) — no real values
- `netlify.toml` (build command + Next.js plugin)
- `.gitignore` fixed to allow `.env.example` to be tracked while still ignoring real `.env*` files
- git repo initialized, scoped to `unstuck-lms/` (not the DASHBOARD root)

## Next.js 16 findings (affects later phases)
Read `node_modules/next/dist/docs` per this project's `AGENTS.md` warning. Confirmed relevant to this build:
- **`middleware.ts` → `proxy.ts`**: Phase 2's Supabase auth session-refresh logic must use `proxy.ts` exporting `function proxy(request: NextRequest)`, not `middleware.ts`. Forced to nodejs runtime (no edge option).
- **`cookies()`/`headers()`**: async-only, no sync fallback (fully removed, not just deprecated in 16). All Supabase SSR helper usage must `await` these.
- **Route Handlers**: unchanged conventions. Stripe webhook route reads raw body via `await request.text()` before JSON-parsing, needed for signature verification.
- **Caching**: unchanged from Next 15 defaults since `cacheComponents` is not enabled in `next.config.ts` — fetch uncached by default, no action needed.

## Gates
- Typecheck (`tsc --noEmit`): clean
- Lint (`npm run lint`): clean, exit 0
- `git status`: clean after commit
- Commit: `d43233d`

## Assumed
- Project name `unstuck-lms`, no changes from plan
