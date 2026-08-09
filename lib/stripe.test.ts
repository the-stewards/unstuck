import { describe, expect, it } from "vitest";

describe("lib/stripe (regression)", () => {
  it("does not throw on import when STRIPE_SECRET_KEY is unset", async () => {
    // Regression for a real bug hit during Phase 3: `new Stripe(...)` at
    // module scope threw immediately without a key, which crashed
    // `next build`'s route-data-collection step for every route that
    // imported this module. The client must be a lazy singleton.
    delete process.env.STRIPE_SECRET_KEY;
    await expect(import("@/lib/stripe")).resolves.toBeDefined();
  });

  it("only throws when the lazy client is actually constructed", async () => {
    delete process.env.STRIPE_SECRET_KEY;
    const { getStripe } = await import("@/lib/stripe");
    expect(() => getStripe()).toThrow();
  });
});
