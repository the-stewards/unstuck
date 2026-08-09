import { describe, expect, it } from "vitest";

describe("lib/notify (regression)", () => {
  it("does not throw on import when RESEND_API_KEY is unset", async () => {
    // Regression for the same class of bug as lib/stripe.ts: `new
    // Resend(...)` at module scope threw immediately without a key,
    // crashing `next build` for /api/stripe/webhook (which imports this
    // module). The client must be a lazy singleton.
    delete process.env.RESEND_API_KEY;
    await expect(import("@/lib/notify")).resolves.toBeDefined();
  });
});
