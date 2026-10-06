import { beforeEach, describe, expect, it } from "vitest";
import { unsubscribeToken, unsubscribeUrl, verifyUnsubscribeToken } from "@/lib/unsubscribe";

describe("unsubscribe tokens", () => {
  beforeEach(() => {
    process.env.CRON_SECRET = "test-secret";
  });

  it("verifies a token for the address it was made for (case/space-insensitive)", () => {
    const t = unsubscribeToken("Jane@Example.com ");
    expect(verifyUnsubscribeToken("jane@example.com", t)).toBe(true);
  });

  it("rejects a token for a different address, a tampered token, and an empty token", () => {
    const t = unsubscribeToken("jane@example.com");
    expect(verifyUnsubscribeToken("someone-else@example.com", t)).toBe(false);
    expect(verifyUnsubscribeToken("jane@example.com", t.slice(0, -1) + (t.endsWith("a") ? "b" : "a"))).toBe(false);
    expect(verifyUnsubscribeToken("jane@example.com", "")).toBe(false);
  });

  it("tokens change if the secret changes (old links die when the secret rotates)", () => {
    const t = unsubscribeToken("jane@example.com");
    process.env.CRON_SECRET = "rotated";
    expect(verifyUnsubscribeToken("jane@example.com", t)).toBe(false);
  });

  it("builds an absolute link with the encoded address", () => {
    const url = unsubscribeUrl("jane+x@example.com", "https://unstuck.stewards.loan/");
    expect(url).toMatch(/^https:\/\/unstuck\.stewards\.loan\/api\/unsubscribe\?e=jane%2Bx%40example\.com&t=[0-9a-f]{40}$/);
  });

  it("fails closed when CRON_SECRET is missing", () => {
    delete process.env.CRON_SECRET;
    expect(verifyUnsubscribeToken("jane@example.com", "x".repeat(40))).toBe(false);
  });
});
