import { describe, expect, it } from "vitest";
import { computeStatus } from "@/lib/progress";

describe("computeStatus", () => {
  it("is not_started at zero watch time", () => {
    expect(computeStatus(0, 600)).toBe("not_started");
  });

  it("is not_started for negative watch time", () => {
    expect(computeStatus(-5, 600)).toBe("not_started");
  });

  it("is in_progress below the completion threshold", () => {
    expect(computeStatus(300, 600)).toBe("in_progress");
  });

  it("is complete at exactly the 95% threshold", () => {
    expect(computeStatus(570, 600)).toBe("complete");
  });

  it("is complete once watch time exceeds duration", () => {
    expect(computeStatus(700, 600)).toBe("complete");
  });

  it("is in_progress, not complete, one second under threshold", () => {
    expect(computeStatus(569, 600)).toBe("in_progress");
  });

  it("never reports complete when duration is unset (0)", () => {
    // Guards against a module with no duration_seconds ever appearing
    // falsely "complete" — durationSeconds > 0 is required in the formula.
    expect(computeStatus(500, 0)).toBe("in_progress");
  });
});
