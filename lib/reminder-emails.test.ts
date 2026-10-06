import { beforeEach, describe, expect, it, vi } from "vitest";

const sendMock = vi.fn();
vi.mock("resend", () => ({
  Resend: class {
    emails = { send: sendMock };
  },
}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));

import { reminderCopy, reminderHtml, sendSessionReminderEmail } from "@/lib/reminder-emails";

const base = {
  email: "jane@example.com",
  firstName: "Jane",
  timeLabel: "12:00 PM ET",
  joinUrl: "https://us06web.zoom.us/j/1?pwd=abc",
  joinLabel: "Join The Session",
  rsvpUrl: "https://www.stewards.loan/unstuck",
  unsubscribeUrl: "https://unstuck.stewards.loan/api/unsubscribe?e=a&t=b",
};

describe("session reminder emails", () => {
  beforeEach(() => {
    sendMock.mockReset();
    process.env.RESEND_API_KEY = "re_x";
    process.env.RESEND_FROM_EMAIL = "noreply@stewards.loan";
  });

  it("has distinct subjects for 24h, 1h, starting now and after", () => {
    const subjects = (["t24h", "t1h", "tnow", "after"] as const).map((k) => reminderCopy(k, "Jane", "12:00 PM ET").subject);
    expect(subjects).toEqual([
      "Tomorrow at 12:00 PM ET: your UNSTUCK session",
      "Starts in 1 hour: join UNSTUCK",
      "Starting now: join UNSTUCK",
      "Thanks for registering for UNSTUCK",
    ]);
  });

  it("join reminders carry the Zoom button; the post-session email sends people to the RSVP page instead", () => {
    for (const kind of ["t24h", "t1h", "tnow"] as const) {
      const html = reminderHtml({ ...base, kind });
      expect(html).toContain('href="https://us06web.zoom.us/j/1?pwd=abc"');
      expect(html).not.toContain("Reserve Your Seat For Next Thursday");
    }
    const after = reminderHtml({ ...base, kind: "after" });
    expect(after).toContain('href="https://www.stewards.loan/unstuck"');
    expect(after).toContain("Reserve Your Seat For Next Thursday");
    expect(after).not.toContain("zoom.us");
  });

  it("every email has the unsubscribe link, the mailing address and NMLS, and escapes the name", () => {
    const html = reminderHtml({ ...base, firstName: "<b>Jane</b>", kind: "t24h" });
    expect(html).toContain("api/unsubscribe");
    expect(html).toContain("8101 N High St");
    expect(html).toContain("NMLS #141868");
    expect(html).toContain("&lt;b&gt;Jane&lt;/b&gt;");
    expect(html).not.toContain("<b>Jane</b>");
  });

  it("sends List-Unsubscribe headers and throws when Resend reports an error", async () => {
    sendMock.mockResolvedValue({ data: {}, error: null });
    await sendSessionReminderEmail({ ...base, kind: "t1h" });
    const arg = sendMock.mock.calls[0][0];
    expect(arg.headers["List-Unsubscribe"]).toBe("<https://unstuck.stewards.loan/api/unsubscribe?e=a&t=b>");
    expect(arg.headers["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");

    sendMock.mockResolvedValue({ data: null, error: { message: "bad" } });
    await expect(sendSessionReminderEmail({ ...base, kind: "t1h" })).rejects.toBeTruthy();
  });
});
