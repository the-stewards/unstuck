import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/stripe", () => ({
  getStripe: vi.fn(),
}));

const maybeSingle = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle }) }),
      insert: async () => ({ error: null }),
    }),
  }),
}));

import { getStripe } from "@/lib/stripe";
import { POST } from "@/app/api/stripe/checkout/route";

function checkoutRequest(body: unknown) {
  return new Request("http://localhost/api/stripe/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/stripe/checkout", () => {
  beforeEach(() => {
    vi.mocked(getStripe).mockReset();
  });

  it("rejects a missing email without touching Stripe", async () => {
    const response = await POST(checkoutRequest({}));

    expect(response.status).toBe(400);
    expect(getStripe).not.toHaveBeenCalled();
  });

  it("returns the Checkout session URL on success", async () => {
    vi.mocked(getStripe).mockReturnValue({
      checkout: {
        sessions: {
          create: vi.fn(async () => ({ url: "https://checkout.stripe.com/session_123" })),
        },
      },
    } as never);

    const response = await POST(checkoutRequest({ email: "buyer@example.com" }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.url).toBe("https://checkout.stripe.com/session_123");
  });

  it("returns a JSON error instead of throwing when Stripe fails", async () => {
    // Regression for a real bug hit in Phase 4: PurchaseButton always calls
    // response.json() on the result. An uncaught exception here used to
    // fall through to Next's HTML error page, which breaks that .json()
    // call on the client.
    vi.mocked(getStripe).mockImplementation(() => {
      throw new Error("Invalid API key");
    });

    const response = await POST(checkoutRequest({ email: "buyer@example.com" }));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBeTruthy();
  });

  it("upsell buyers return to the form's calendar page (purchased=1); everyone else gets the normal success page", async () => {
    const create = vi.fn(async (_args: { success_url: string }) => ({ url: "https://checkout.stripe.com/s", id: "cs_1" }));
    vi.mocked(getStripe).mockReturnValue({ checkout: { sessions: { create } } } as never);
    process.env.NEXT_PUBLIC_APP_URL = "https://unstuck.stewards.loan";

    await POST(checkoutRequest({ email: "buyer@example.com", from: "webinar" }));
    await POST(checkoutRequest({ email: "buyer@example.com", from: "https://evil.example" }));
    await POST(checkoutRequest({ email: "buyer@example.com" }));

    const urls = create.mock.calls.map((c) => c[0].success_url);
    expect(urls[0]).toBe("https://www.stewards.loan/unstuck.save?purchased=1");
    expect(urls[1]).toContain("/purchase/success?session_id=");
    expect(urls[2]).toContain("/purchase/success?session_id=");
  });

  describe("leadId (step 2 page: opaque id instead of email in the URL)", () => {
    const LEAD = "109d1383-f723-4163-8c02-998598fc02d2";

    it("resolves the email server-side and ignores any client-supplied email", async () => {
      maybeSingle.mockResolvedValue({ data: { email: "Jane@Example.com" }, error: null });
      const create = vi.fn(async (_args: { customer_email: string }) => ({ url: "https://checkout.stripe.com/s", id: "cs_1" }));
      vi.mocked(getStripe).mockReturnValue({ checkout: { sessions: { create } } } as never);

      const res = await POST(checkoutRequest({ leadId: LEAD, email: "attacker@example.com", from: "webinar" }));
      expect(res.status).toBe(200);
      expect(create.mock.calls[0][0].customer_email).toBe("jane@example.com");
    });

    it("400s an unknown lead id without calling Stripe", async () => {
      maybeSingle.mockResolvedValue({ data: null, error: null });
      const res = await POST(checkoutRequest({ leadId: LEAD }));
      expect(res.status).toBe(400);
      expect((await res.json()).error).toMatch(/RSVP/);
      expect(getStripe).not.toHaveBeenCalled();
    });

    it("400s a malformed lead id without touching the database", async () => {
      maybeSingle.mockClear();
      const res = await POST(checkoutRequest({ leadId: "not-a-uuid" }));
      expect(res.status).toBe(400);
      expect(maybeSingle).not.toHaveBeenCalled();
    });
  });
});
