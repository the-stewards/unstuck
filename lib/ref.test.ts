import { describe, expect, it } from "vitest";
import { sanitizeRef } from "@/lib/ref";

describe("sanitizeRef", () => {
  it.each(["meta", "ig", "email", "a-b_C9"])("keeps a clean channel: %s", (v) => {
    expect(sanitizeRef(v)).toBe(v);
  });

  it("strips everything except letters, numbers, dash and underscore", () => {
    expect(sanitizeRef("m e/t?a=<1>")).toBe("meta1");
  });

  it("caps at 30 characters", () => {
    expect(sanitizeRef("a".repeat(80))).toBe("a".repeat(30));
  });

  it.each([null, undefined, "", "!!!", 42, ["meta"]])("returns null for nothing usable: %s", (v) => {
    expect(sanitizeRef(v)).toBeNull();
  });
});
