import { beforeEach, describe, expect, it, vi } from "vitest";

// ---- in-memory stand-in for the supabase-js calls lib/reminders.ts makes ----
let leads: Record<string, unknown>[] = [];
let suppressions: { email: string }[] = [];
let claims: { lead_id: string; kind: string }[] = [];
let leadsError: unknown = null;

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === "leads") {
        const f: { gte?: string; lte?: string } = {};
        const b = {
          select: () => b,
          gte: (_c: string, v: string) => ((f.gte = v), b),
          lte: (_c: string, v: string) => ((f.lte = v), b),
          limit: () => b,
          then: (resolve: (v: unknown) => void) =>
            resolve({
              data: leadsError
                ? null
                : leads.filter((l) => String(l.session_at) >= f.gte! && String(l.session_at) <= f.lte!),
              error: leadsError,
            }),
        };
        return b;
      }
      if (table === "email_suppressions") {
        const b = {
          select: () => b,
          in: (_c: string, emails: string[]) => ({
            then: (resolve: (v: unknown) => void) =>
              resolve({ data: suppressions.filter((s) => emails.includes(s.email)), error: null }),
          }),
        };
        return b;
      }
      // lead_reminders
      return {
        insert: async (row: { lead_id: string; kind: string }) => {
          if (claims.some((c) => c.lead_id === row.lead_id && c.kind === row.kind)) {
            return { error: { code: "23505", message: "duplicate" } };
          }
          claims.push(row);
          return { error: null };
        },
        delete: () => ({
          eq: (_c1: string, leadId: string) => ({
            eq: async (_c2: string, kind: string) => {
              claims = claims.filter((c) => !(c.lead_id === leadId && c.kind === kind));
              return { error: null };
            },
          }),
        }),
      };
    },
  }),
}));

const sendMock = vi.fn();
vi.mock("@/lib/reminder-emails", () => ({ sendSessionReminderEmail: (...a: unknown[]) => sendMock(...a) }));

process.env.CRON_SECRET = "test-secret";

import { dueReminderKinds, sendDueReminders } from "@/lib/reminders";

// Session: Thu 2026-10-08 12:00 ET = 16:00Z. 60-minute session.
const S = new Date("2026-10-08T16:00:00Z");
const at = (iso: string) => new Date(iso);

describe("dueReminderKinds", () => {
  const rsvpEarly = at("2026-10-02T12:00:00Z"); // a week ahead

  it("24h reminder: from 24h before until 12h before, never earlier or much later", () => {
    expect(dueReminderKinds(S, rsvpEarly, at("2026-10-07T15:59:00Z"), 60)).toEqual([]);
    expect(dueReminderKinds(S, rsvpEarly, at("2026-10-07T16:00:00Z"), 60)).toEqual(["t24h"]);
    expect(dueReminderKinds(S, rsvpEarly, at("2026-10-08T03:59:00Z"), 60)).toEqual(["t24h"]);
    expect(dueReminderKinds(S, rsvpEarly, at("2026-10-08T04:00:00Z"), 60)).toEqual([]);
  });

  it("1h reminder, starting-now, and the post-session email each have their own window", () => {
    expect(dueReminderKinds(S, rsvpEarly, at("2026-10-08T15:00:00Z"), 60)).toEqual(["t1h"]);
    expect(dueReminderKinds(S, rsvpEarly, at("2026-10-08T15:40:00Z"), 60)).toEqual([]);
    expect(dueReminderKinds(S, rsvpEarly, at("2026-10-08T16:03:00Z"), 60)).toEqual(["tnow"]);
    expect(dueReminderKinds(S, rsvpEarly, at("2026-10-08T16:20:00Z"), 60)).toEqual([]);
    expect(dueReminderKinds(S, rsvpEarly, at("2026-10-08T17:29:00Z"), 60)).toEqual([]); // session still running
    expect(dueReminderKinds(S, rsvpEarly, at("2026-10-08T17:30:00Z"), 60)).toEqual(["after"]);
    expect(dueReminderKinds(S, rsvpEarly, at("2026-10-09T15:59:00Z"), 60)).toEqual(["after"]);
    expect(dueReminderKinds(S, rsvpEarly, at("2026-10-09T16:00:00Z"), 60)).toEqual([]);
  });

  it("skips reminders whose moment had already passed when the person RSVPed", () => {
    const wedNight = at("2026-10-08T01:00:00Z"); // Tue 9pm ET, ~15h before the session
    expect(dueReminderKinds(S, wedNight, at("2026-10-08T01:30:00Z"), 60)).toEqual(["t24h"].filter(() => false));
    expect(dueReminderKinds(S, wedNight, at("2026-10-08T15:05:00Z"), 60)).toEqual(["t1h"]);
    const lastMinute = at("2026-10-08T15:30:00Z"); // RSVP 30 min before
    expect(dueReminderKinds(S, lastMinute, at("2026-10-08T15:35:00Z"), 60)).toEqual([]); // no 1h email (already inside the hour)
    expect(dueReminderKinds(S, lastMinute, at("2026-10-08T16:02:00Z"), 60)).toEqual(["tnow"]);
  });

  it("never fires for a session far away or long past", () => {
    expect(dueReminderKinds(S, rsvpEarly, at("2026-10-05T16:00:00Z"), 60)).toEqual([]);
    expect(dueReminderKinds(S, rsvpEarly, at("2026-10-20T16:00:00Z"), 60)).toEqual([]);
  });
});

describe("sendDueReminders", () => {
  const lead = (over: Record<string, unknown> = {}) => ({
    id: "lead-1",
    email: "jane@example.com",
    first_name: "Jane",
    form_key: "webinar",
    session_at: "2026-10-08T16:00:00.000Z",
    created_at: "2026-10-02T12:00:00.000Z",
    ...over,
  });

  beforeEach(() => {
    leads = [];
    suppressions = [];
    claims = [];
    leadsError = null;
    sendMock.mockReset();
    sendMock.mockResolvedValue(undefined);
  });

  it("sends the due reminder once, and a second run in the same window sends nothing more", async () => {
    leads = [lead()];
    const first = await sendDueReminders(at("2026-10-07T17:00:00Z"));
    expect(first).toMatchObject({ sent: 1, failed: 0 });
    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(sendMock.mock.calls[0][0]).toMatchObject({
      email: "jane@example.com",
      kind: "t24h",
      timeLabel: "12:00 PM ET",
      joinUrl: expect.stringContaining("zoom.us/j/"),
    });
    expect(sendMock.mock.calls[0][0].unsubscribeUrl).toContain("/api/unsubscribe?e=jane%40example.com&t=");

    const second = await sendDueReminders(at("2026-10-07T17:05:00Z"));
    expect(second.sent).toBe(0);
    expect(sendMock).toHaveBeenCalledTimes(1);
  });

  it("only touches leads whose own session is near: other cycles' RSVPs get nothing", async () => {
    leads = [lead({ id: "this-week" }), lead({ id: "next-week", session_at: "2026-10-15T16:00:00.000Z" })];
    await sendDueReminders(at("2026-10-07T17:00:00Z"));
    const ids = sendMock.mock.calls.map((c) => c[0].email + c[0].kind);
    expect(sendMock).toHaveBeenCalledTimes(1); // only this week's lead
    expect(ids).toEqual(["jane@example.comt24h"]);
  });

  it("skips unsubscribed addresses entirely", async () => {
    leads = [lead()];
    suppressions = [{ email: "jane@example.com" }];
    const r = await sendDueReminders(at("2026-10-07T17:00:00Z"));
    expect(r).toMatchObject({ sent: 0, skippedSuppressed: 1 });
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("releases the claim when a send fails, so the next run retries it", async () => {
    leads = [lead()];
    sendMock.mockRejectedValueOnce(new Error("resend down"));
    const r1 = await sendDueReminders(at("2026-10-07T17:00:00Z"));
    expect(r1).toMatchObject({ sent: 0, failed: 1 });
    expect(claims).toHaveLength(0);

    const r2 = await sendDueReminders(at("2026-10-07T17:05:00Z"));
    expect(r2).toMatchObject({ sent: 1, failed: 0 });
  });

  it("does not send a reminder it could not claim (never sends unclaimed)", async () => {
    leads = [lead()];
    claims = [{ lead_id: "lead-1", kind: "t24h" }]; // an earlier run already sent it
    const r = await sendDueReminders(at("2026-10-07T17:00:00Z"));
    expect(r.sent).toBe(0);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("sends the post-session email with the RSVP link target and nothing for legacy leads without a session", async () => {
    leads = [lead(), lead({ id: "legacy", session_at: null })];
    await sendDueReminders(at("2026-10-08T17:35:00Z"));
    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(sendMock.mock.calls[0][0]).toMatchObject({ kind: "after", rsvpUrl: "https://www.stewards.loan/unstuck" });
  });

  it("propagates a database read failure (the cron route turns it into a 500)", async () => {
    leadsError = { message: "boom" };
    await expect(sendDueReminders(at("2026-10-07T17:00:00Z"))).rejects.toBeTruthy();
  });
});
