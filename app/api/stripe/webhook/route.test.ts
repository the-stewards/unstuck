import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/stripe", () => ({ getStripe: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/access", () => ({ grantAccess: vi.fn() }));
vi.mock("@/lib/notify", () => ({ sendAccessGrantedEmail: vi.fn() }));

import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { grantAccess } from "@/lib/access";
import { sendAccessGrantedEmail } from "@/lib/notify";
import { POST } from "@/app/api/stripe/webhook/route";

const fakeSession = {
  id: "cs_test_123",
  customer: "cus_test_123",
  customer_details: { email: "Buyer@Example.com" },
  customer_email: null,
  amount_total: 4700,
};

const fakeEvent = {
  type: "checkout.session.completed",
  data: { object: fakeSession },
};

function webhookRequest() {
  return new Request("http://localhost/api/stripe/webhook", {
    method: "POST",
    headers: { "stripe-signature": "test-signature" },
    body: JSON.stringify({}),
  });
}

function mockOrdersInsert(error: { code: string } | null) {
  const insert = vi.fn(async () => ({ error }));
  vi.mocked(createAdminClient).mockReturnValue({
    from: vi.fn(() => ({ insert })),
  } as never);
  return insert;
}

describe("POST /api/stripe/webhook (idempotency)", () => {
  beforeEach(() => {
    vi.mocked(getStripe).mockReturnValue({
      webhooks: { constructEvent: vi.fn(() => fakeEvent) },
    } as never);
    vi.mocked(grantAccess).mockReset();
    vi.mocked(sendAccessGrantedEmail).mockReset();
  });

  it("grants access and sends one email on first delivery", async () => {
    mockOrdersInsert(null);
    vi.mocked(grantAccess).mockResolvedValue({ granted: true, alreadyGranted: false });

    const response = await POST(webhookRequest());

    expect(response.status).toBe(200);
    expect(grantAccess).toHaveBeenCalledTimes(1);
    expect(grantAccess).toHaveBeenCalledWith(
      expect.objectContaining({ email: "buyer@example.com", source: "stripe_purchase" })
    );
    expect(sendAccessGrantedEmail).toHaveBeenCalledTimes(1);
  });

  it("does not grant access or send a second email on a retried delivery", async () => {
    // Stripe retries webhook delivery on anything but a 2xx response, so a
    // duplicate event for the same session must be a no-op past the order
    // insert — this is what stripe_session_id's unique constraint enforces.
    mockOrdersInsert({ code: "23505" });

    const response = await POST(webhookRequest());

    expect(response.status).toBe(200);
    expect(grantAccess).not.toHaveBeenCalled();
    expect(sendAccessGrantedEmail).not.toHaveBeenCalled();
  });
});
