import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

// Signed one-click unsubscribe links for session emails. The token is an HMAC of
// the address, so a link can only unsubscribe the address it was made for and
// nobody can unsubscribe someone else by guessing. Keyed with CRON_SECRET (an
// existing production env var), so no new secret is needed.

function secret(): string {
  const s = process.env.CRON_SECRET;
  if (!s) throw new Error("CRON_SECRET is not set");
  return s;
}

const normalize = (email: string) => email.trim().toLowerCase();

export function unsubscribeToken(email: string): string {
  return createHmac("sha256", secret()).update(`unsub:${normalize(email)}`).digest("hex").slice(0, 40);
}

export function verifyUnsubscribeToken(email: string, token: string): boolean {
  try {
    const expected = Buffer.from(unsubscribeToken(email));
    const given = Buffer.from(token);
    return expected.length === given.length && timingSafeEqual(expected, given);
  } catch {
    return false;
  }
}

export function unsubscribeUrl(email: string, origin: string): string {
  const base = origin.replace(/\/+$/, "");
  return `${base}/api/unsubscribe?e=${encodeURIComponent(normalize(email))}&t=${unsubscribeToken(email)}`;
}
