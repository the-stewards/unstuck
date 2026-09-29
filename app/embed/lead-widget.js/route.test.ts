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

  it("initializes each target once (idempotent for CMS double-execution)", () => {
    expect(LEAD_WIDGET_JS).toContain("data-unstuck-ready");
  });
});
