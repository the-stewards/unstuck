# Build Log — unstuck-lms

- 2026-08-09 — Plan locked in. Phase 0 started: scaffolded Next.js 16.3.0 (App Router, TS, Tailwind v4, Turbopack default) via create-next-app. Installed @supabase/supabase-js, @supabase/ssr, stripe, resend, zod, @netlify/plugin-nextjs. Added .env.example, netlify.toml.
- 2026-08-09 — Confirmed Next 16 breaking changes relevant to this build: `middleware.ts` renamed to `proxy.ts` (auth session-refresh proxy must use new file/export name, forced to nodejs runtime, no edge); `cookies()`/`headers()` sync fallback fully removed (must always await); route handlers otherwise unchanged (raw body via `request.text()` for Stripe signature verification); caching defaults unchanged from Next 15 since `cacheComponents` is not enabled in `next.config.ts`.
