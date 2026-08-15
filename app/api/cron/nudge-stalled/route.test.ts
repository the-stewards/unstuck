import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/nudges", () => ({ getStalledStudents: vi.fn() }));
vi.mock("@/lib/notify", () => ({
  sendStalledNudgeEmail: vi.fn(),
  sendAdminAlert: vi.fn(),
}));

import { createAdminClient } from "@/lib/supabase/admin";
import { getStalledStudents } from "@/lib/nudges";
import { sendStalledNudgeEmail, sendAdminAlert } from "@/lib/notify";
import { GET } from "@/app/api/cron/nudge-stalled/route";

function request(headers: Record<string, string> = {}) {
  return new Request("https://unstuck.stewards.loan/api/cron/nudge-stalled", { headers });
}

describe("GET /api/cron/nudge-stalled", () => {
  beforeEach(() => {
    vi.mocked(createAdminClient).mockReset();
    vi.mocked(getStalledStudents).mockReset();
    vi.mocked(sendStalledNudgeEmail).mockReset();
    vi.mocked(sendAdminAlert).mockReset();
    process.env.CRON_SECRET = "test-secret";
  });

  it("rejects a request with no bearer token", async () => {
    const response = await GET(request());

    expect(response.status).toBe(401);
    expect(getStalledStudents).not.toHaveBeenCalled();
  });

  it("rejects a request with the wrong bearer token", async () => {
    const response = await GET(request({ authorization: "Bearer wrong" }));

    expect(response.status).toBe(401);
    expect(getStalledStudents).not.toHaveBeenCalled();
  });

  it("rejects every request when CRON_SECRET is unset, even a matching header", async () => {
    delete process.env.CRON_SECRET;

    const response = await GET(request({ authorization: "Bearer undefined" }));

    expect(response.status).toBe(401);
  });

  it("sends a nudge to each stalled student and stamps last_nudged_at", async () => {
    vi.mocked(getStalledStudents).mockResolvedValue([
      { id: "s1", email: "stalled@example.com" },
    ]);
    vi.mocked(sendStalledNudgeEmail).mockResolvedValue(undefined);
    const update = vi.fn(() => ({ eq: vi.fn(async () => ({ error: null })) }));
    vi.mocked(createAdminClient).mockReturnValue({ from: vi.fn(() => ({ update })) } as never);

    const response = await GET(request({ authorization: "Bearer test-secret" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ candidates: 1, sent: 1, failed: 0 });
    expect(sendStalledNudgeEmail).toHaveBeenCalledWith("stalled@example.com");
    expect(sendAdminAlert).not.toHaveBeenCalled();
  });

  it("keeps sending to the rest of the batch after one failure, then alerts admin", async () => {
    vi.mocked(getStalledStudents).mockResolvedValue([
      { id: "s1", email: "broken@example.com" },
      { id: "s2", email: "fine@example.com" },
    ]);
    vi.mocked(sendStalledNudgeEmail).mockImplementation(async (email) => {
      if (email === "broken@example.com") throw new Error("Resend rejected");
    });
    const update = vi.fn(() => ({ eq: vi.fn(async () => ({ error: null })) }));
    vi.mocked(createAdminClient).mockReturnValue({ from: vi.fn(() => ({ update })) } as never);

    const response = await GET(request({ authorization: "Bearer test-secret" }));
    const body = await response.json();

    expect(body).toEqual({ candidates: 2, sent: 1, failed: 1 });
    expect(sendAdminAlert).toHaveBeenCalledTimes(1);
  });
});
