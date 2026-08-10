import { describe, expect, it } from "vitest";
import { assertSafeDubbEmbed } from "@/lib/dubb-embed";

const VALID_EMBED =
  '<div style="position: relative; height: 0; padding-bottom: 56.25%;"><iframe style="position: absolute; width: 100%; height: 100%; left: 0;" allow="autoplay; encrypted-media; picture-in-picture" src="https://dubb.com/v/EVy7lb/embed?width=auto&height=auto&autoplay=0&no_cta=0&no_controls=0&muted=0" width="auto" height="auto" frameborder="0" allowfullscreen></iframe></div>';

describe("assertSafeDubbEmbed", () => {
  it("accepts the real Dubb embed snippet, including its no_controls= param", () => {
    // Regression: the forbidden-markup check for on\w+= (event handlers)
    // used to match unanchored, so "no_controls=0" false-positived on the
    // "on" inside "controls" and rejected every real Dubb embed.
    expect(() => assertSafeDubbEmbed(VALID_EMBED)).not.toThrow();
  });

  it("rejects an embed with no dubb.com iframe at all", () => {
    expect(() => assertSafeDubbEmbed("<p>not an embed</p>")).toThrow(
      "Embed code must include an <iframe> with a dubb.com src URL."
    );
  });

  it("rejects a real event handler attribute", () => {
    const malicious = VALID_EMBED.replace("<iframe ", '<iframe onload="alert(1)" ');
    expect(() => assertSafeDubbEmbed(malicious)).toThrow("disallowed markup");
  });

  it("rejects an injected script tag", () => {
    const malicious = `${VALID_EMBED}<script>alert(1)</script>`;
    expect(() => assertSafeDubbEmbed(malicious)).toThrow("disallowed markup");
  });
});
