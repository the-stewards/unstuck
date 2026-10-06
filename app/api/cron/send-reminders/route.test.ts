import { beforeEach, describe, expect, it, vi } from "vitest";

const run = vi.fn();
vi.mock("@/lib/reminders", () => ({ sendDueReminders: (...a: unknown[]) => run(...a) }));

import { GET } from "@/app/api/cron/send-reminders/route";

const req = (headers: Record<string, string> = {}) =>
  new Request("https://unstuck.stewards.loan/api/cron/send-reminders", { headers });

describe("GET /api/cron/send-reminders", () => {
  beforeEach(() => {
    run.mockReset();
    process.env.CRON_SECRET = "test-secret";
  });

  it("rejects missing or wrong tokens without sending anything", async () => {
    expect((await GET(req())).status).toBe(401);
    expect((await GET(req({ authorization: "Bearer nope" }))).status).toBe(401);
    expect(run).not.toHaveBeenCalled();
  });

  it("rejects everyone when CRON_SECRET is unset", async () => {
    delete process.env.CRON_SECRET;
    expect((await GET(req({ authorization: "Bearer undefined" }))).status).toBe(401);
  });

  it("returns the counts for a valid token", async () => {
    run.mockResolvedValue({ considered: 2, sent: 2, skippedSuppressed: 0, failed: 0 });
    const res = await GET(req({ authorization: "Bearer test-secret" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ considered: 2, sent: 2, skippedSuppressed: 0, failed: 0 });
  });

  it("answers 500 JSON (not an HTML crash) when the run itself fails", async () => {
    run.mockRejectedValue(new Error("db down"));
    const res = await GET(req({ authorization: "Bearer test-secret" }));
    expect(res.status).toBe(500);
    expect(await res.json()).toHaveProperty("error");
  });
});
