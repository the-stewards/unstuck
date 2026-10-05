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

describe("sendLeadConfirmationEmail", () => {
  beforeEach(() => {
    sendMock.mockReset();
  });

  it("shows the session date and both save-to-calendar buttons", async () => {
    sendMock.mockResolvedValue({ data: {}, error: null });
    const { sendLeadConfirmationEmail } = await import("@/lib/notify");
    await sendLeadConfirmationEmail("jane@example.com", "Jane", "Unstuck Live Training", "This Thursday at 12:00 PM ET", {
      google: "https://calendar.google.com/calendar/render?a=1&b=2",
      ics: "https://unstuck.stewards.loan/api/leads/calendar?form=webinar",
    });
    const html = sendMock.mock.calls[0][0].html as string;
    expect(html).toContain("This Thursday at 12:00 PM ET");
    expect(html).toContain("Save it to your calendar");
    expect(html).toContain("https://calendar.google.com/calendar/render?a=1&amp;b=2");
    expect(html).toContain("/api/leads/calendar?form=webinar");
  });

  it("shows a Zoom join button with its note when a join link is given, and omits it otherwise", async () => {
    sendMock.mockResolvedValue({ data: {}, error: null });
    const { sendLeadConfirmationEmail } = await import("@/lib/notify");
    await sendLeadConfirmationEmail("jane@example.com", "Jane", "Event", "This Thursday at 12:00 PM ET", undefined, {
      url: "https://us06web.zoom.us/meeting/register/abc",
      label: "Confirm Your Seat On Zoom",
      note: "Register once on Zoom.",
    });
    const html = sendMock.mock.calls.at(-1)![0].html as string;
    expect(html).toContain("Your Zoom link");
    expect(html).toContain('href="https://us06web.zoom.us/meeting/register/abc"');
    expect(html).toContain("Confirm Your Seat On Zoom");
    expect(html).toContain("Register once on Zoom.");

    await sendLeadConfirmationEmail("jane@example.com", "Jane", "Event", "Date");
    expect(sendMock.mock.calls.at(-1)![0].html as string).not.toContain("Your Zoom link");
  });

  it("omits the calendar block when no links are given, and escapes the name", async () => {
    sendMock.mockResolvedValue({ data: {}, error: null });
    const { sendLeadConfirmationEmail } = await import("@/lib/notify");
    await sendLeadConfirmationEmail("x@example.com", "<b>Hi</b>", "Event", "Date");
    const html = sendMock.mock.calls[0][0].html as string;
    expect(html).not.toContain("Save it to your calendar");
    expect(html).toContain("&lt;b&gt;Hi&lt;/b&gt;");
  });
});
