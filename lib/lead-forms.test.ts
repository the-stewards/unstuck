import { describe, expect, it } from "vitest";
import { LEAD_FORMS, getCalendarPageUrl } from "@/lib/lead-forms";

describe("lead form config", () => {
  const form = LEAD_FORMS.webinar;

  it("upsell checkout is an https Stripe Payment Link", () => {
    expect(form.upsell?.checkoutUrl).toMatch(/^https:\/\/buy\.stripe\.com\/[A-Za-z0-9]+$/);
  });

  it("calendar page is an absolute https URL, or falls back to the hosted page", () => {
    expect(getCalendarPageUrl(form, "https://unstuck.stewards.loan")).toMatch(/^https:\/\//);
    expect(getCalendarPageUrl({ ...form, calendarPageUrl: undefined }, "https://unstuck.stewards.loan/")).toBe(
      "https://unstuck.stewards.loan/calendar/webinar"
    );
  });
});
