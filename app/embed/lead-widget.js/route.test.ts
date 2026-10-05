import { describe, expect, it } from "vitest";
import { GET } from "@/app/embed/lead-widget.js/route";
import { LEAD_WIDGET_JS } from "@/lib/lead-widget-source";

describe("lead widget script", () => {
  it("is served as JavaScript with CORS open", async () => {
    const res = await GET();
    expect(res.headers.get("content-type")).toContain("application/javascript");
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
    expect(await res.text()).toContain("data-unstuck-lead");
  });

  it("is syntactically valid JS (guards template-literal escaping mistakes)", () => {
    // The source lives inside a TS template literal; a stray backtick or
    // ${...} would only surface in a visitor's browser console otherwise.
    expect(() => new Function(LEAD_WIDGET_JS)).not.toThrow();
  });

  it("renders the required homeowner question and routes non-owners to the registered page", () => {
    expect(LEAD_WIDGET_JS).toContain('input[name="homeowner_status"]');
    expect(LEAD_WIDGET_JS).toContain("radio.required = true");
    expect(LEAD_WIDGET_JS).toContain("homeowner_status: selectedStatus()");
    expect(LEAD_WIDGET_JS).toContain('selectedStatus() !== "owner_central_ohio"');
    expect(LEAD_WIDGET_JS).toContain("form.registeredPageUrl");
  });

  it("fires the pixel Lead event only for owners, only when enabled, with the lead id as eventID", () => {
    expect(LEAD_WIDGET_JS).toContain('selectedStatus() === "owner_central_ohio" && form.fireLeadOnRegister');
    expect(LEAD_WIDGET_JS).toContain('typeof window.fbq === "function"');
    expect(LEAD_WIDGET_JS).toContain('{ eventID: data.leadId }');
    // Only one pixel call in the whole script, and it is the Lead call.
    expect((LEAD_WIDGET_JS.match(/fbq\(/g) ?? []).length).toBe(2);
    expect(LEAD_WIDGET_JS).not.toMatch(/fbq\("track", "(Purchase|CompleteRegistration|PageView)"/);
  });

  it("initializes each target once (idempotent for CMS double-execution)", () => {
    expect(LEAD_WIDGET_JS).toContain("data-unstuck-ready");
  });
});
