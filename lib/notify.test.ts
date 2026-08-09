import { beforeEach, describe, expect, it, vi } from "vitest";

const sendMock = vi.fn();

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: sendMock };
  },
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    auth: {
      admin: {
        generateLink: vi.fn(async () => ({
          data: { properties: { action_link: "https://unstuck.stewards.loan/magic" } },
          error: null,
        })),
      },
    },
  })),
}));

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

describe("sendAccessGrantedEmail", () => {
  beforeEach(() => {
    sendMock.mockReset();
  });

  it("throws when Resend reports an error in the response instead of rejecting", async () => {
    // Regression for a real P2 found in Codex review: Resend reports API
    // rejections (bad sender, rejected recipient domain — exactly what hit
    // in the Phase 6 smoke test) through the resolved response's `error`
    // field, not by rejecting the promise. Ignoring that made this function
    // report success even when nothing was sent.
    sendMock.mockResolvedValue({
      data: null,
      error: { name: "validation_error", message: "Invalid `to` field." },
    });

    const { sendAccessGrantedEmail } = await import("@/lib/notify");

    await expect(sendAccessGrantedEmail("student@example.com")).rejects.toMatchObject({
      message: "Invalid `to` field.",
    });
  });

  it("resolves when Resend reports success", async () => {
    sendMock.mockResolvedValue({ data: { id: "email_123" }, error: null });

    const { sendAccessGrantedEmail } = await import("@/lib/notify");

    await expect(sendAccessGrantedEmail("student@example.com")).resolves.toBeUndefined();
  });
});
