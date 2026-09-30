import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/leads/calendar/route";

const get = (qs: string) => GET(new Request(`http://localhost/api/leads/calendar${qs}`));

describe("GET /api/leads/calendar", () => {
  it("serves a downloadable text/calendar file", async () => {
    const res = await get("?form=webinar");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/calendar");
    expect(res.headers.get("content-disposition")).toContain("attachment");
    expect(await res.text()).toContain("RRULE:FREQ=WEEKLY;BYDAY=TH");
  });

  it("404s an unknown or missing form", async () => {
    expect((await get("?form=nope")).status).toBe(404);
    expect((await get("")).status).toBe(404);
  });
});
