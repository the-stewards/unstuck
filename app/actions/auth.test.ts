import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { requestMagicLink } from "@/app/actions/auth";

function formDataWith(email: string) {
  const formData = new FormData();
  formData.set("email", email);
  return formData;
}

describe("requestMagicLink", () => {
  beforeEach(() => {
    vi.mocked(createClient).mockReset();
  });

  it("rejects an invalid email without touching Supabase", async () => {
    const result = await requestMagicLink(formDataWith("not-an-email"));

    expect(result.success).toBe(false);
    expect(createClient).not.toHaveBeenCalled();
  });

  it("returns success when signInWithOtp succeeds", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { signInWithOtp: vi.fn(async () => ({ error: null })) },
    } as never);

    const result = await requestMagicLink(formDataWith("student@example.com"));

    expect(result).toEqual({ success: true });
  });

  it("surfaces a Supabase-reported error gracefully", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        signInWithOtp: vi.fn(async () => ({ error: { message: "Rate limit exceeded" } })),
      },
    } as never);

    const result = await requestMagicLink(formDataWith("student@example.com"));

    expect(result).toEqual({ success: false, error: "Rate limit exceeded" });
  });

  it("returns a graceful error instead of throwing when Supabase is unreachable", async () => {
    // Regression for a real bug hit in Phase 4: this action must always
    // resolve to a MagicLinkResult — LoginForm awaits it directly with no
    // try/catch of its own. An uncaught exception here used to surface as
    // Next's generic full-page error boundary on submit.
    vi.mocked(createClient).mockRejectedValue(new Error("network unreachable"));

    const result = await requestMagicLink(formDataWith("student@example.com"));

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });
});
