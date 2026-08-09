import { describe, expect, it } from "vitest";
import { computeStatus } from "@/lib/progress";

describe("computeStatus", () => {
  it("is not_started at zero watch time", () => {
    expect(computeStatus(0)).toBe("not_started");
  });

  it("is not_started for negative watch time", () => {
    expect(computeStatus(-5)).toBe("not_started");
  });

  it("is in_progress for any positive watch time", () => {
    expect(computeStatus(1)).toBe("in_progress");
    expect(computeStatus(300)).toBe("in_progress");
  });
});
