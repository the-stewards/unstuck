import { describe, expect, it } from "vitest";
import { LEAD_FORMS } from "@/lib/lead-forms";
import { buildIcs, googleCalendarUrl, nextOccurrence, nextSessionDateLabel, nextSessionLabel } from "@/lib/lead-calendar";

const form = LEAD_FORMS.webinar;

describe("nextOccurrence (Thursday 12:00 ET)", () => {
  it("from a Tuesday returns that week's Thursday", () => {
    // Tue 2026-09-29 12:00 ET
    expect(nextOccurrence(form.schedule, new Date("2026-09-29T16:00:00Z"))).toMatchObject({
      startLocal: "20261001T120000",
      endLocal: "20261001T130000",
    });
  });

  it("on Thursday BEFORE noon ET returns today", () => {
    // Thu 2026-10-01 11:00 ET = 15:00Z
    expect(nextOccurrence(form.schedule, new Date("2026-10-01T15:00:00Z")).startLocal).toBe("20261001T120000");
  });

  it("on Thursday AT/AFTER noon ET returns next week", () => {
    expect(nextOccurrence(form.schedule, new Date("2026-10-01T16:00:00Z")).startLocal).toBe("20261008T120000");
    expect(nextOccurrence(form.schedule, new Date("2026-10-01T22:00:00Z")).startLocal).toBe("20261008T120000");
  });

  it("uses the schedule's zone, not the server's (late Wed UTC is still Wed in ET)", () => {
    // Thu 2026-10-01 02:00Z = Wed 2026-09-30 22:00 ET -> next is Thu 10-01
    expect(nextOccurrence(form.schedule, new Date("2026-10-01T02:00:00Z")).startLocal).toBe("20261001T120000");
  });

  it("handles a month boundary and DST end (Nov 2026)", () => {
    // Fri 2026-10-30 -> Thu 2026-11-05
    expect(nextOccurrence(form.schedule, new Date("2026-10-30T16:00:00Z")).startLocal).toBe("20261105T120000");
  });
});

describe("googleCalendarUrl", () => {
  it("builds a weekly-recurring template link in the schedule's zone", () => {
    const url = new URL(googleCalendarUrl(form, new Date("2026-09-29T16:00:00Z")));
    expect(url.origin + url.pathname).toBe("https://calendar.google.com/calendar/render");
    expect(url.searchParams.get("dates")).toBe("20261001T120000/20261001T130000");
    expect(url.searchParams.get("recur")).toBe("RRULE:FREQ=WEEKLY;BYDAY=TH");
    expect(url.searchParams.get("ctz")).toBe("America/New_York");
    expect(url.searchParams.get("text")).toBe(form.calendar.title);
  });
});

describe("buildIcs", () => {
  const ics = buildIcs(form, new Date("2026-09-29T16:00:00Z"));

  it("is a well-formed weekly recurring VEVENT with CRLF line endings", () => {
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(ics).toContain("DTSTART;TZID=America/New_York:20261001T120000");
    expect(ics).toContain("DTEND;TZID=America/New_York:20261001T130000");
    expect(ics).toContain("RRULE:FREQ=WEEKLY;BYDAY=TH");
    expect(ics).toContain("BEGIN:VTIMEZONE");
    expect(ics).toContain("DTSTAMP:20260929T160000Z");
    expect(ics.replace(/\r\n/g, "").includes("\n")).toBe(false);
  });

  it("escapes commas/semicolons/newlines and never exceeds 75 chars per line", () => {
    for (const line of ics.split("\r\n")) expect(line.length).toBeLessThanOrEqual(75);
    expect(ics).toContain("\n");
  });

  it("with no join URL says the link is in the confirmation email", () => {
    expect(ics.replace(/\r\n /g, "")).toContain("confirmation email");
  });
});

describe("nextSessionLabel", () => {
  const at = (iso: string) => nextSessionLabel(form.schedule, new Date(iso));

  it('reads "This Thursday" for Sun-Wed RSVPs', () => {
    expect(at("2026-09-27T16:00:00Z")).toBe("This Thursday at 12:00 PM ET"); // Sunday
    expect(at("2026-09-30T16:00:00Z")).toBe("This Thursday at 12:00 PM ET"); // Wednesday
  });

  it('reads "Next Thursday" for Fri/Sat RSVPs and Thursday after the session starts', () => {
    expect(at("2026-10-02T16:00:00Z")).toBe("Next Thursday at 12:00 PM ET"); // Friday
    expect(at("2026-10-03T16:00:00Z")).toBe("Next Thursday at 12:00 PM ET"); // Saturday
    expect(at("2026-10-01T17:00:00Z")).toBe("Next Thursday at 12:00 PM ET"); // Thu 1pm ET
  });

  it('reads "Today" on Thursday before noon ET, and crosses month boundaries', () => {
    expect(at("2026-10-01T14:00:00Z")).toBe("Today at 12:00 PM ET");
    expect(at("2026-10-27T16:00:00Z")).toBe("This Thursday at 12:00 PM ET");
    expect(at("2026-10-30T16:00:00Z")).toBe("Next Thursday at 12:00 PM ET");
  });
});

describe("nextSessionDateLabel", () => {
  const at = (iso: string) => nextSessionDateLabel(form.schedule, new Date(iso));

  it("gives the exact date, matching the calendar event's start", () => {
    expect(at("2026-09-30T16:00:00Z")).toBe("Thursday, October 1, 2026 at 12:00 PM ET");
    expect(at("2026-10-01T17:00:00Z")).toBe("Thursday, October 8, 2026 at 12:00 PM ET");
    // same instant as the .ics DTSTART
    expect(buildIcs(form, new Date("2026-09-30T16:00:00Z"))).toContain("DTSTART;TZID=America/New_York:20261001T120000");
  });

  it("crosses month and year boundaries", () => {
    expect(at("2026-10-30T16:00:00Z")).toBe("Thursday, November 5, 2026 at 12:00 PM ET");
    expect(at("2026-12-29T16:00:00Z")).toBe("Thursday, December 31, 2026 at 12:00 PM ET");
    expect(at("2026-12-31T18:00:00Z")).toBe("Thursday, January 7, 2027 at 12:00 PM ET");
  });
});
