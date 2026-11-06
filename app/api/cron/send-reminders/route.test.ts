import { beforeEach, describe, expect, it, vi } from "vitest";

const run = vi.fn();
vi.mock("@/lib/reminders", () => ({ sendDueReminders: (...a: unknown[]) => run(...a) }));
const metaRetry = vi.fn();
vi.mock("@/lib/meta-lead", () => ({ retryUnsentMetaLeads: (...a: unknown[]) => metaRetry(...a) }));

import { GET } from "@/app/api/cron/send-reminders/route";

const req = (headers: Record<string, string> = {}) =>
  new Request("https://unstuck.stewards.loan/api/cron/send-reminders", { headers });

describe("GET /api/cron/send-reminders", () => {
  beforeEach(() => {
    run.mockReset();
    metaRetry.mockReset();
    metaRetry.mockResolvedValue({ skipped: true, considered: 0, sent: 0, failed: 0 });
    process.env.CRON_SECRET = "test-secret";
  });

  it("rejects missing or wrong tokens without sending anything", async () => {
    expect((await GET(req())).status).toBe(401);
    expect((await GET(req({ authorization: "Bearer nope" }))).status).toBe(401);
    expect(run).not.toHaveBeenCalled();
    expect(metaRetry).not.toHaveBeenCalled();
  });

  it("rejects everyone when CRON_SECRET is unset", async () => {
    delete process.env.CRON_SECRET;
    expect((await GET(req({ authorization: "Bearer undefined" }))).status).toBe(401);
  });

  it("returns the reminder counts plus the Meta retry result for a valid token", async () => {
    run.mockResolvedValue({ considered: 2, sent: 2, skippedSuppressed: 0, failed: 0 });
    metaRetry.mockResolvedValue({ considered: 1, sent: 1, failed: 0 });
    const res = await GET(req({ authorization: "Bearer test-secret" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      considered: 2,
      sent: 2,
      skippedSuppressed: 0,
      failed: 0,
      metaLeads: { considered: 1, sent: 1, failed: 0 },
    });
  });

  it("a Meta retry failure never affects the reminders result", async () => {
    run.mockResolvedValue({ considered: 1, sent: 1, skippedSuppressed: 0, failed: 0 });
    metaRetry.mockRejectedValue(new Error("db down"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await GET(req({ authorization: "Bearer test-secret" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ sent: 1, metaLeads: { error: "retry failed" } });
  });

  it("answers 500 JSON (not an HTML crash) when the reminder run itself fails", async () => {
    run.mockRejectedValue(new Error("db down"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await GET(req({ authorization: "Bearer test-secret" }));
    expect(res.status).toBe(500);
    expect(await res.json()).toHaveProperty("error");
  });
});
