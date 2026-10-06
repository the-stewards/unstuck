import { beforeEach, describe, expect, it, vi } from "vitest";

const upsertMock = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: () => ({ upsert: upsertMock }) }),
}));

import { GET, POST } from "@/app/api/unsubscribe/route";
import { unsubscribeUrl } from "@/lib/unsubscribe";

const urlFor = (email: string) => unsubscribeUrl(email, "https://unstuck.stewards.loan");

describe("/api/unsubscribe", () => {
  beforeEach(() => {
    process.env.CRON_SECRET = "test-secret";
    upsertMock.mockReset();
    upsertMock.mockResolvedValue({ error: null });
  });

  it("GET only shows a confirm button and never unsubscribes (mail scanners prefetch links)", async () => {
    const res = await GET(new Request(urlFor("jane@example.com")));
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("<form");
    expect(html).toContain("Unsubscribe");
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it("POST with a valid signed link records the suppression", async () => {
    const res = await POST(new Request(urlFor("Jane@Example.com"), { method: "POST" }));
    expect(res.status).toBe(200);
    expect(upsertMock).toHaveBeenCalledWith({ email: "jane@example.com", reason: "unsubscribe" }, expect.anything());
    expect(await res.text()).toContain("unsubscribed");
  });

  it("rejects a forged or tampered link without writing anything", async () => {
    const forged = "https://unstuck.stewards.loan/api/unsubscribe?e=victim%40example.com&t=" + "0".repeat(40);
    expect((await POST(new Request(forged, { method: "POST" }))).status).toBe(400);
    expect((await GET(new Request(forged))).status).toBe(400);
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it("returns a readable error (not a crash) if the database write fails", async () => {
    upsertMock.mockResolvedValue({ error: { message: "table missing" } });
    const res = await POST(new Request(urlFor("jane@example.com"), { method: "POST" }));
    expect(res.status).toBe(500);
  });
});
