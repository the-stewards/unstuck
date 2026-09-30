import { beforeEach, describe, expect, it, vi } from "vitest";

const flush = vi.fn();
vi.mock("@/lib/lead-outbox", () => ({ flushLeadOutbox: (...a: unknown[]) => flush(...a) }));

import { GET } from "@/app/api/cron/flush-leads/route";

const req = (headers: Record<string, string> = {}) =>
  new Request("https://unstuck.stewards.loan/api/cron/flush-leads", { headers });

describe("GET /api/cron/flush-leads", () => {
  beforeEach(() => {
    flush.mockReset();
    process.env.CRON_SECRET = "test-secret";
  });

  it("rejects missing or wrong bearer tokens without flushing", async () => {
    expect((await GET(req())).status).toBe(401);
    expect((await GET(req({ authorization: "Bearer wrong" }))).status).toBe(401);
    expect(flush).not.toHaveBeenCalled();
  });

  it("rejects everyone when CRON_SECRET is unset", async () => {
    delete process.env.CRON_SECRET;
    expect((await GET(req({ authorization: "Bearer undefined" }))).status).toBe(401);
  });

  it("flushes and returns the counts for a valid token", async () => {
    flush.mockResolvedValue({ sent: 2, failed: 0, skipped: false });
    const res = await GET(req({ authorization: "Bearer test-secret" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ sent: 2, failed: 0, skipped: false });
    expect(flush).toHaveBeenCalledWith({ limit: 50 });
  });
});
