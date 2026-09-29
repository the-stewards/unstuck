# Phase 3-4 Report - Routes, widget, iframe fallback
Status: complete. tsc clean, eslint 0 errors.
- `GET /api/leads/count?form=` - form copy + consent wording + count + minCount; CORS; count failure degrades to 0.
- `POST /api/leads` - honeypot fake-success, 10KB cap, server-side consent/validation, rate limit, 409 dup, confirmation email best-effort (never fails the request), always JSON + CORS.
- `GET /embed/lead-widget.js` - script-tag widget (`<div data-unstuck-lead="webinar">`), API origin derived from script src, idempotent init, count-up with reduced-motion guard, counter hidden below minCount (`data-min-count` override).
- `/embed/lead/[formKey]` - iframe fallback; reuses the same widget script, posts `unstuck-lead-resize` height to parent. Deviation from plan: no separate `components/LeadForm.tsx` - one UI implementation instead of two.
