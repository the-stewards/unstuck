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

describe("POST /api/stripe/webhook", () => {
  beforeEach(() => {
    vi.mocked(getStripe).mockReturnValue({
      webhooks: { constructEvent: vi.fn(() => fakeEvent) },
    } as never);
    vi.mocked(grantAccess).mockReset();
    vi.mocked(sendAccessGrantedEmail).mockReset();
  });

  it("grants access, sends one email, and records the order on first delivery", async () => {
    const insert = mockOrdersInsert(null);
    vi.mocked(grantAccess).mockResolvedValue({ granted: true, alreadyGranted: false });

    const response = await POST(webhookRequest());

    expect(response.status).toBe(200);
    expect(grantAccess).toHaveBeenCalledWith(
      expect.objectContaining({ email: "buyer@example.com", source: "stripe_purchase" })
    );
    expect(sendAccessGrantedEmail).toHaveBeenCalledTimes(1);
    expect(insert).toHaveBeenCalledTimes(1);
  });

  it("does not send a second email on a retried delivery (grantAccess already idempotent)", async () => {
    // grantAccess() is the idempotency boundary now, not the order insert —
    // a retry calls grantAccess again, which reports the existing grant.
    mockOrdersInsert({ code: "23505" });
    vi.mocked(grantAccess).mockResolvedValue({ granted: false, alreadyGranted: true });

    const response = await POST(webhookRequest());

    expect(response.status).toBe(200);
    expect(sendAccessGrantedEmail).not.toHaveBeenCalled();
  });

  it("still returns 200 and keeps the grant when order bookkeeping fails", async () => {
    // Regression for a real P1 found in Codex review: the order insert used
    // to run first and gate everything else, so any failure there (or a
    // later step throwing) meant a retry would skip grantAccess/email
    // forever. It's bookkeeping now — its failure must not undo or block
    // the grant that already succeeded.
    mockOrdersInsert({ code: "23502" }); // not a unique violation — a real failure
    vi.mocked(grantAccess).mockResolvedValue({ granted: true, alreadyGranted: false });

    const response = await POST(webhookRequest());

    expect(response.status).toBe(200);
    expect(grantAccess).toHaveBeenCalledTimes(1);
    expect(sendAccessGrantedEmail).toHaveBeenCalledTimes(1);
  });

  it("still returns 200 and still records the order when the access email fails to send", async () => {
    // Regression for the email half of the same P1: a Resend failure must
    // not turn into a 500 that makes Stripe retry — a retry wouldn't help,
    // since grantAccess would just report the grant already exists.
    const insert = mockOrdersInsert(null);
    vi.mocked(grantAccess).mockResolvedValue({ granted: true, alreadyGranted: false });
    vi.mocked(sendAccessGrantedEmail).mockRejectedValue(new Error("Resend rejected recipient"));

    const response = await POST(webhookRequest());

    expect(response.status).toBe(200);
    expect(insert).toHaveBeenCalledTimes(1);
  });
});
