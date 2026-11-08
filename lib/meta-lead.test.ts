import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeSupabase, type Tables } from "@/test/fake-supabase";

vi.mock("server-only", () => ({}));

const sendMock = vi.fn();
let configured = true;
vi.mock("@/lib/meta-capi", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/meta-capi")>()),
  isMetaCapiConfigured: () => configured,
  sendMetaLead: (...a: unknown[]) => sendMock(...a),
}));

let tables: Tables = {};
let failTables: string[] = [];
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => createFakeSupabase(tables, { failTables }),
}));

import { personEventId } from "@/lib/meta-capi";
import { reportFirstVerifiedSignIn, reportLeadToMeta, retryUnsentMetaLeads } from "@/lib/meta-lead";

const student = (over: Record<string, unknown> = {}) => ({
  id: "user-1",
  email: "jane@example.com",
  signup_ref: null,
  first_verified_at: null,
  meta_lead_sent_at: null,
  ...over,
});
const lead = (over: Record<string, unknown> = {}) => ({
  id: "lead-1",
  email: "jane@example.com",
  ip: "1.2.3.4",
  user_agent: "UA",
  homeowner_status: "owner_central_ohio",
  meta_lead_sent_at: null,
  created_at: "2026-11-05T12:00:00Z",
  ...over,
});
const signIn = { userId: "user-1", email: "Jane@Example.com", signupRef: "meta", ip: "9.9.9.9", userAgent: "Browser" };

beforeEach(() => {
  sendMock.mockReset();
  sendMock.mockResolvedValue(true);
  configured = true;
  failTables = [];
  tables = { students: [student()], leads: [] };
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("reportFirstVerifiedSignIn", () => {
  it("reports one Lead with a stable per-person event id, no qualification condition, and marks the person", async () => {
    await reportFirstVerifiedSignIn(signIn);
    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(sendMock).toHaveBeenCalledWith({
      eventId: personEventId("jane@example.com"),
      email: "jane@example.com",
      ip: "9.9.9.9",
      userAgent: "Browser",
    });
    expect(tables.students[0].meta_lead_sent_at).toEqual(expect.any(String));
  });

  it("records the first verified sign-in time and the channel, and never sends the channel to Meta", async () => {
    await reportFirstVerifiedSignIn(signIn);
    expect(tables.students[0].first_verified_at).toEqual(expect.any(String));
    expect(tables.students[0].signup_ref).toBe("meta");
    expect(JSON.stringify(sendMock.mock.calls)).not.toContain("meta\"");
    expect(sendMock.mock.calls[0][0]).not.toHaveProperty("signupRef");
  });

  it("sanitizes the channel before storing it", async () => {
    await reportFirstVerifiedSignIn({ ...signIn, signupRef: "ig<script>&x=1" });
    expect(tables.students[0].signup_ref).toBe("igscriptx1");
  });

  it("a second sign-in sends nothing and never overwrites the original time or channel", async () => {
    await reportFirstVerifiedSignIn(signIn);
    const firstAt = tables.students[0].first_verified_at;
    await reportFirstVerifiedSignIn({ ...signIn, signupRef: "ig" });
    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(tables.students[0].first_verified_at).toBe(firstAt);
    expect(tables.students[0].signup_ref).toBe("meta");
  });

  it("does not report someone already reported through the webinar path (leads.meta_lead_sent_at)", async () => {
    tables.leads = [lead({ meta_lead_sent_at: "2026-11-01T00:00:00Z" })];
    await reportFirstVerifiedSignIn(signIn);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("marks the person's webinar RSVP rows too, so the webinar path can never send a second Lead", async () => {
    tables.leads = [lead()];
    await reportFirstVerifiedSignIn(signIn);
    expect(tables.leads[0].meta_lead_sent_at).toEqual(expect.any(String));
  });

  it("retries once quickly when Meta fails, then leaves the person unflagged for the scheduled retry", async () => {
    sendMock.mockResolvedValue(false);
    await expect(reportFirstVerifiedSignIn(signIn)).resolves.toBeUndefined();
    expect(sendMock).toHaveBeenCalledTimes(2);
    expect(tables.students[0].meta_lead_sent_at).toBeNull();
    expect(tables.students[0].first_verified_at).toEqual(expect.any(String)); // eligible for retry
  });

  it("still records the sign-in and channel when Meta isn't configured, and sends nothing", async () => {
    configured = false;
    await reportFirstVerifiedSignIn(signIn);
    expect(sendMock).not.toHaveBeenCalled();
    expect(tables.students[0].first_verified_at).toEqual(expect.any(String));
    expect(tables.students[0].signup_ref).toBe("meta");
  });

  it("never throws, even if the database or Meta blows up", async () => {
    failTables = ["students", "leads"];
    await expect(reportFirstVerifiedSignIn(signIn)).resolves.toBeUndefined();
    expect(sendMock).not.toHaveBeenCalled();
    failTables = [];
    sendMock.mockRejectedValue(new Error("boom"));
    await expect(reportFirstVerifiedSignIn(signIn)).resolves.toBeUndefined();
  });
});

describe("reportLeadToMeta (webinar path)", () => {
  const rsvp = { id: "lead-1", email: "Jane@Example.com", ip: "1.2.3.4", userAgent: "UA" };

  beforeEach(() => {
    tables = { students: [], leads: [lead()] };
  });

  it("uses the same per-person event id as the sign-in path and marks the RSVP", async () => {
    await reportLeadToMeta(rsvp);
    expect(sendMock).toHaveBeenCalledWith({ eventId: personEventId("jane@example.com"), email: "jane@example.com", ip: "1.2.3.4", userAgent: "UA" });
    expect(tables.leads[0].meta_lead_sent_at).toEqual(expect.any(String));
  });

  it("sends nothing for someone who already signed in and was reported, and marks the RSVP so it isn't retried", async () => {
    tables.students = [student({ meta_lead_sent_at: "2026-11-02T00:00:00Z" })];
    await reportLeadToMeta(rsvp);
    expect(sendMock).not.toHaveBeenCalled();
    expect(tables.leads[0].meta_lead_sent_at).toEqual(expect.any(String));
  });

  it("does nothing when Meta isn't configured, and doesn't mark anyone", async () => {
    configured = false;
    await reportLeadToMeta(rsvp);
    expect(sendMock).not.toHaveBeenCalled();
    expect(tables.leads[0].meta_lead_sent_at).toBeNull();
  });

  it("leaves the RSVP unmarked when Meta fails (so it is retried) and never throws", async () => {
    sendMock.mockResolvedValue(false);
    await expect(reportLeadToMeta(rsvp)).resolves.toBeUndefined();
    expect(tables.leads[0].meta_lead_sent_at).toBeNull();
  });
});

describe("retryUnsentMetaLeads", () => {
  const now = new Date("2026-11-06T12:00:00Z");

  it("is a no-op when Meta isn't configured", async () => {
    configured = false;
    expect(await retryUnsentMetaLeads(now)).toEqual({ skipped: true, considered: 0, sent: 0, failed: 0 });
  });

  it("resends verified sign-ins with their original time, and marks them", async () => {
    tables = { students: [student({ first_verified_at: "2026-11-05T15:00:00Z" })], leads: [] };
    const result = await retryUnsentMetaLeads(now);
    expect(result).toEqual({ considered: 1, sent: 1, failed: 0 });
    expect(sendMock.mock.calls[0][0]).toMatchObject({
      eventId: personEventId("jane@example.com"),
      eventTime: Math.floor(Date.parse("2026-11-05T15:00:00Z") / 1000),
    });
    expect(tables.students[0].meta_lead_sent_at).toEqual(expect.any(String));
  });

  it("counts a person who is on both lists (RSVP and sign-in) once", async () => {
    tables = { students: [student({ first_verified_at: "2026-11-05T15:00:00Z" })], leads: [lead()] };
    const result = await retryUnsentMetaLeads(now);
    expect(result).toEqual({ considered: 1, sent: 1, failed: 0 });
    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(tables.leads[0].meta_lead_sent_at).toEqual(expect.any(String));
  });

  it("ignores sign-ins older than 3 days and people already reported", async () => {
    tables = {
      students: [
        student({ id: "old", email: "old@example.com", first_verified_at: "2026-11-01T00:00:00Z" }),
        student({ id: "done", email: "done@example.com", first_verified_at: "2026-11-05T00:00:00Z", meta_lead_sent_at: "2026-11-05T00:01:00Z" }),
      ],
      leads: [],
    };
    expect(await retryUnsentMetaLeads(now)).toEqual({ considered: 0, sent: 0, failed: 0 });
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("counts failures and leaves them unflagged for the next run", async () => {
    sendMock.mockResolvedValue(false);
    tables = { students: [student({ first_verified_at: "2026-11-05T15:00:00Z" })], leads: [] };
    expect(await retryUnsentMetaLeads(now)).toEqual({ considered: 1, sent: 0, failed: 1 });
    expect(tables.students[0].meta_lead_sent_at).toBeNull();
  });

  it("throws on a database error so the caller can isolate it", async () => {
    failTables = ["students"];
    await expect(retryUnsentMetaLeads(now)).rejects.toThrow(/unavailable/);
  });
});
