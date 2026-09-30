import type { LeadFormConfig } from "@/lib/lead-forms";

// Pure helpers for the "save to calendar" step: next occurrence of the
// recurring session, a Google Calendar template link, and an .ics file
// (Apple Calendar / Outlook / anything). No dependencies, no I/O.

const DAY_INDEX: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
const BYDAY = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

const pad = (n: number) => String(n).padStart(2, "0");

// Wall-clock time, no zone: YYYYMMDDTHHMMSS (paired with a TZID/ctz).
function fmtLocal(d: Date): string {
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00`
  );
}

function fmtUtc(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

// Next start (today counts if the session hasn't started yet) as wall-clock
// time in the schedule's zone. Arithmetic is done on a UTC-based calendar
// date so the host machine's own timezone never leaks in.
export function nextOccurrence(schedule: LeadFormConfig["schedule"], now: Date = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: schedule.tz,
      hourCycle: "h23",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      weekday: "short",
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value])
  );

  const nowMinutes = Number(parts.hour) * 60 + Number(parts.minute);
  const startMinutes = schedule.hour * 60 + schedule.minute;
  let delta = (schedule.weekday - DAY_INDEX[parts.weekday] + 7) % 7;
  if (delta === 0 && nowMinutes >= startMinutes) delta = 7;

  const start = new Date(
    Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day) + delta, schedule.hour, schedule.minute)
  );
  const end = new Date(start.getTime() + schedule.durationMinutes * 60_000);
  return { startLocal: fmtLocal(start), endLocal: fmtLocal(end) };
}

function description(form: LeadFormConfig): string {
  return form.calendar.joinUrl
    ? `${form.calendar.description}\n\nJoin: ${form.calendar.joinUrl}`
    : `${form.calendar.description}\n\nYour join link is in your confirmation email.`;
}

function location(form: LeadFormConfig): string {
  return form.calendar.joinUrl || "Online (join link in your confirmation email)";
}

export function googleCalendarUrl(form: LeadFormConfig, now: Date = new Date()): string {
  const { startLocal, endLocal } = nextOccurrence(form.schedule, now);
  const q = new URLSearchParams({
    action: "TEMPLATE",
    text: form.calendar.title,
    dates: `${startLocal}/${endLocal}`,
    details: description(form),
    location: location(form),
    recur: `RRULE:FREQ=WEEKLY;BYDAY=${BYDAY[form.schedule.weekday]}`,
    ctz: form.schedule.tz,
  });
  return `https://calendar.google.com/calendar/render?${q.toString()}`;
}

const esc = (s: string) =>
  s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

// RFC 5545: lines over 75 octets are folded with CRLF + space.
function fold(line: string): string {
  const out: string[] = [];
  let rest = line;
  while (rest.length > 74) {
    out.push(rest.slice(0, 74));
    rest = " " + rest.slice(74);
  }
  out.push(rest);
  return out.join("\r\n");
}

// US Eastern rules. Only America/New_York is supported today; add a VTIMEZONE
// block here before configuring another zone.
const VTIMEZONE_NEW_YORK = [
  "BEGIN:VTIMEZONE",
  "TZID:America/New_York",
  "BEGIN:STANDARD",
  "DTSTART:19701101T020000",
  "RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU",
  "TZOFFSETFROM:-0400",
  "TZOFFSETTO:-0500",
  "TZNAME:EST",
  "END:STANDARD",
  "BEGIN:DAYLIGHT",
  "DTSTART:19700308T020000",
  "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU",
  "TZOFFSETFROM:-0500",
  "TZOFFSETTO:-0400",
  "TZNAME:EDT",
  "END:DAYLIGHT",
  "END:VTIMEZONE",
];

export function buildIcs(form: LeadFormConfig, now: Date = new Date()): string {
  if (form.schedule.tz !== "America/New_York") {
    throw new Error(`No VTIMEZONE block for ${form.schedule.tz}`);
  }
  const { startLocal, endLocal } = nextOccurrence(form.schedule, now);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//The Stewards//Unstuck//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...VTIMEZONE_NEW_YORK,
    "BEGIN:VEVENT",
    `UID:${form.key}-live-training@unstuck.stewards.loan`,
    `DTSTAMP:${fmtUtc(now)}`,
    `DTSTART;TZID=${form.schedule.tz}:${startLocal}`,
    `DTEND;TZID=${form.schedule.tz}:${endLocal}`,
    `RRULE:FREQ=WEEKLY;BYDAY=${BYDAY[form.schedule.weekday]}`,
    `SUMMARY:${esc(form.calendar.title)}`,
    `DESCRIPTION:${esc(description(form))}`,
    `LOCATION:${esc(location(form))}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT15M",
    "ACTION:DISPLAY",
    `DESCRIPTION:${esc(form.calendar.title)} starts in 15 minutes`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.map(fold).join("\r\n") + "\r\n";
}
