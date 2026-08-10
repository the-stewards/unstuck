import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/admin", () => ({ requireAdminEmail: vi.fn(async () => "ryan@stewards.loan") }));

import { requireAdminEmail } from "@/lib/admin";
import { runAdminAction } from "@/lib/action-result";

describe("runAdminAction", () => {
  beforeEach(() => {
    vi.mocked(requireAdminEmail).mockReset();
    vi.mocked(requireAdminEmail).mockResolvedValue("ryan@stewards.loan");
  });

  it("returns success with the fn's return value", async () => {
    const result = await runAdminAction(async () => "ok");
    expect(result).toEqual({ success: true, data: "ok" });
  });

  it("extracts the message from a native Error", async () => {
    const result = await runAdminAction(async () => {
      throw new Error("Not authorized.");
    });
    expect(result).toEqual({ success: false, error: "Not authorized." });
  });

  it("extracts the message from a Supabase-shaped PostgrestError (not a real Error instance)", async () => {
    // Regression: `if (error) throw error` throughout app/actions/* throws
    // Supabase's plain {code, message, details, hint} object directly, not
    // a native Error. An `err instanceof Error` check misses this and used
    // to fall back to a generic "Something went wrong," hiding real
    // failures like a missing column.
    const result = await runAdminAction(async () => {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw { code: "42703", message: 'column "content_url" does not exist', details: null, hint: null };
    });
    expect(result).toEqual({ success: false, error: 'column "content_url" does not exist' });
  });

  it("falls back to a generic message for a throw with no usable message", async () => {
    const result = await runAdminAction(async () => {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw "just a string";
    });
    expect(result).toEqual({ success: false, error: "Something went wrong. Try again." });
  });
});
