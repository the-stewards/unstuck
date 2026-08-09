import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/stripe", () => ({
  getStripe: vi.fn(),
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
});
