import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const sendMock = vi.fn();
vi.mock("@/lib/meta-capi", () => ({
  isMetaCapiConfigured: () => process.env.META_CAPI_TOKEN !== undefined && process.env.META_CAPI_TOKEN !== "",
  sendMetaLead: (...a: unknown[]) => sendMock(...a),
}));

// Minimal chainable fake of the supabase calls meta-lead makes.
const updates: Array<{ id: string; patch: Record<string, unknown> }> = [];
let unsentRows: Array<Record<string, unknown>> = [];
let selectError: unknown = null;
const filters: Record<string, unknown> = {};

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => {
      const chain: Record<string, unknown> = {};
      let patch: Record<string, unknown> | null = null;
      let eqId: string | null = null;
      chain.update = (p: Record<string, unknown>) => {
        patch = p;
        return chain;
      };
      chain.select = () => chain;
      chain.is = (col: string, v: unknown) => {
        filters[`is:${col}`] = v;
        return chain;
      };
      chain.eq = (col: string, v: unknown) => {
        filters[`eq:${col}`] = v;
        if (col === "id") eqId = String(v);
        // the update path ends on .is(...) which we resolve below via thenable
        return chain;
      };
      chain.gte = (col: string, v: unknown) => {
        filters[`gte:${col}`] = v;
        return chain;
      };
      chain.order = () => chain;
      chain.limit = () => Promise.resolve({ data: unsentRows, error: selectError });
      chain.then = (resolve: (v: unknown) => unknown) => {
        if (patch && eqId) updates.push({ id: eqId, patch });
        return Promise.resolve({ error: null }).then(resolve);
      };
      return chain;
    },
  }),
}));

import { reportLeadToMeta, retryUnsentMetaLeads } from "@/lib/meta-lead";

const lead = { id: "lead-1", email: "jane@example.com", ip: "1.2.3.4", userAgent: "UA" };

describe("reportLeadToMeta", () => {
  beforeEach(() => {
    sendMock.mockReset();
    updates.length = 0;
    unsentRows = [];
    selectError = null;
    for (const k of Object.keys(filters)) delete filters[k];
    process.env.META_CAPI_TOKEN = "tok";
  });

  it("does nothing when Meta isn't configured", async () => {
    delete process.env.META_CAPI_TOKEN;
    await reportLeadToMeta(lead);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("sends the lead id as the event id, then marks the lead as reported", async () => {
    sendMock.mockResolvedValue(true);
    await reportLeadToMeta(lead);
    expect(sendMock).toHaveBeenCalledWith({ eventId: "lead-1", email: "jane@example.com", ip: "1.2.3.4", userAgent: "UA" });
    expect(updates).toHaveLength(1);
    expect(updates[0].id).toBe("lead-1");
    expect(updates[0].patch.meta_lead_sent_at).toEqual(expect.any(String));
  });

  it("does not mark the lead as reported when Meta fails (so it is retried)", async () => {
    sendMock.mockResolvedValue(false);
    await reportLeadToMeta(lead);
    expect(updates).toHaveLength(0);
  });

  it("never throws, even if the sender does", async () => {
    sendMock.mockRejectedValue(new Error("boom"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(reportLeadToMeta(lead)).resolves.toBeUndefined();
    expect(updates).toHaveLength(0);
  });
});

describe("retryUnsentMetaLeads", () => {
  beforeEach(() => {
    sendMock.mockReset();
    updates.length = 0;
    selectError = null;
    for (const k of Object.keys(filters)) delete filters[k];
    process.env.META_CAPI_TOKEN = "tok";
    unsentRows = [
      { id: "a", email: "a@example.com", ip: "1.1.1.1", user_agent: "UA-a", created_at: "2026-11-05T12:00:00Z" },
      { id: "b", email: "b@example.com", ip: "unknown", user_agent: "UA-b", created_at: "2026-11-05T13:00:00Z" },
    ];
  });

  it("is a no-op when Meta isn't configured", async () => {
    delete process.env.META_CAPI_TOKEN;
    expect(await retryUnsentMetaLeads()).toEqual({ skipped: true, considered: 0, sent: 0, failed: 0 });
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("only looks at qualified, unreported leads from the last 3 days", async () => {
    sendMock.mockResolvedValue(true);
    const now = new Date("2026-11-06T12:00:00Z");
    await retryUnsentMetaLeads(now);
    expect(filters["is:meta_lead_sent_at"]).toBeNull();
    expect(filters["eq:homeowner_status"]).toBe("owner_central_ohio");
    expect(filters["gte:created_at"]).toBe("2026-11-03T12:00:00.000Z");
  });

  it("resends each with its original event time and marks the successes", async () => {
    sendMock.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    const result = await retryUnsentMetaLeads(new Date("2026-11-06T12:00:00Z"));
    expect(result).toEqual({ considered: 2, sent: 1, failed: 1 });
    expect(sendMock.mock.calls[0][0]).toMatchObject({ eventId: "a", eventTime: Math.floor(Date.parse("2026-11-05T12:00:00Z") / 1000) });
    expect(updates.map((u) => u.id)).toEqual(["a"]);
  });

  it("throws on a database error so the caller can isolate it", async () => {
    selectError = new Error("column meta_lead_sent_at does not exist");
    await expect(retryUnsentMetaLeads()).rejects.toThrow(/meta_lead_sent_at/);
  });
});
