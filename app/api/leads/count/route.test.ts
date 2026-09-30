import { beforeEach, describe, expect, it, vi } from "vitest";

let countResult: { count: number | null; error: unknown } = { count: 0, error: null };
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: () => ({ select: () => ({ eq: async () => countResult }) }),
  })),
}));

import { GET } from "@/app/api/leads/count/route";

const get = (qs: string) => GET(new Request(`http://localhost/api/leads/count${qs}`));

describe("GET /api/leads/count", () => {
  beforeEach(() => {
    countResult = { count: 0, error: null };
  });

  it("returns count, threshold, and the server-owned consent wording", async () => {
    countResult = { count: 137, error: null };
    const res = await get("?form=webinar");
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.count).toBe(137);
    expect(data.minCount).toBe(25);
    expect(data.form.calendar.outlook).toContain("outlook.live.com");
    expect(data.form.calendar.apple).toContain("inline=1");
    expect(data.form.calendar.ics).not.toContain("inline");
    expect(data.nextSessionDate).toMatch(/^Thursday, [A-Za-z]+ [0-9]+, 20[0-9]{2} at 12:00 PM ET$/);
    expect(data.nextSession).toMatch(/^(This|Next) Thursday at 12:00 PM ET$|^Today at 12:00 PM ET$/);
    expect(data.form.calendarPageUrl).toBe("https://www.stewards.loan/unstuck.save");
    expect(data.form.consentText).toContain("reminders for Unstuck");
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
  });

  it("degrades to count 0 (form still renders) if the count query fails", async () => {
    countResult = { count: null, error: { message: "table missing" } };
    const res = await get("?form=webinar");
    expect(res.status).toBe(200);
    expect((await res.json()).count).toBe(0);
  });

  it("404s an unknown or missing form", async () => {
    expect((await get("?form=nope")).status).toBe(404);
    expect((await get("")).status).toBe(404);
  });
});
