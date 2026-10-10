import { describe, expect, it } from "vitest";
import { LEAD_WIDGET_JS } from "@/lib/lead-widget-source";

// attribution() is private to the widget IIFE, so pull its source out of the
// real widget string and run it against a fake window.location.search.
function attributionFor(search: string): string {
  const match = LEAD_WIDGET_JS.match(/function attribution\(\) \{[\s\S]*?\n  \}\n/);
  if (!match) throw new Error("attribution() not found in widget source");
  const run = new Function("window", `${match[0]}\nreturn attribution();`);
  return run({ location: { search } });
}

describe("widget attribution()", () => {
  it("returns an empty string when there are no params", () => {
    expect(attributionFor("")).toBe("");
  });

  it("keeps the existing utm handling unchanged", () => {
    expect(attributionFor("?utm_source=facebook&utm_campaign=oct")).toBe("source=facebook&campaign=oct");
  });

  it("reads ?ref= and puts it first, before the utm pairs", () => {
    expect(attributionFor("?utm_source=facebook&ref=email&utm_medium=cpc")).toBe("ref=email&source=facebook&medium=cpc");
    expect(attributionFor("?ref=email")).toBe("ref=email");
  });

  it.each(["email", "sms", "fb", "ig", "yt", "meta", "sig", "blog"])("passes the allowed ref %s through", (ref) => {
    expect(attributionFor(`?ref=${ref}`)).toBe(`ref=${ref}`);
  });

  it("strips everything except letters, numbers, dash and underscore", () => {
    expect(attributionFor("?ref=" + encodeURIComponent("em ail|<b>&x=1"))).toBe("ref=emailbx1");
    expect(attributionFor("?ref=a-b_C9")).toBe("ref=a-b_C9");
  });

  it("caps ref at 30 characters", () => {
    expect(attributionFor("?ref=" + "a".repeat(80))).toBe("ref=" + "a".repeat(30));
  });

  it("drops a ref that sanitizes to nothing", () => {
    expect(attributionFor("?ref=" + encodeURIComponent("!!!"))).toBe("");
  });

  it("leaves the data-ref join and the 100-char cap in buildForm untouched", () => {
    expect(LEAD_WIDGET_JS).toContain('[target.getAttribute("data-ref") || "", attribution()].filter(Boolean).join("|").slice(0, 100)');
  });
});
