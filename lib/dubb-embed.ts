const DUBB_IFRAME_PATTERN = /<iframe[^>]*\ssrc=["']https:\/\/dubb\.com\/[^"']*["'][^>]*>/i;
// \b before "on" matters — without it this also matches "on" appearing
// inside ordinary words (Dubb's own embed URLs include no_controls=0,
// where "controls" contains "on": c-ON-trols=, a real false positive that
// blocked legitimate embed codes from ever being saved).
const FORBIDDEN_MARKUP_PATTERN = /<script|<object|<embed\b|<link|<meta|<base|<form|<style|javascript:|\bon\w+\s*=/i;

// The embed field is rendered with dangerouslySetInnerHTML on the student
// side (see components/DubbEmbed.tsx) — safe only because writes are
// admin-gated. This allowlist is a second layer: even a compromised admin
// session can only ever save a plain Dubb iframe, not arbitrary HTML/script.
export function assertSafeDubbEmbed(html: string) {
  if (!DUBB_IFRAME_PATTERN.test(html)) {
    throw new Error("Embed code must include an <iframe> with a dubb.com src URL.");
  }
  if (FORBIDDEN_MARKUP_PATTERN.test(html)) {
    throw new Error("Embed code contains disallowed markup (scripts, event handlers, or other tags).");
  }
}
