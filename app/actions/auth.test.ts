import { beforeEach, describe, expect, it, vi } from "vitest";

class RedirectSignal extends Error {
  constructor(public path: string) {
    super(`REDIRECT:${path}`);
  }
}

vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new RedirectSignal(path);
  }),
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));
vi.mock("@/lib/access", () => ({
  checkAccess: vi.fn(),
}));

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkAccess } from "@/lib/access";
import { requestMagicLink } from "@/app/actions/auth";

function formDataWith(email: string) {
  const formData = new FormData();
  formData.set("email", email);
  return formData;
}

describe("requestMagicLink", () => {
  beforeEach(() => {
    vi.mocked(redirect).mockClear();
    vi.mocked(createClient).mockReset();
    vi.mocked(createAdminClient).mockReset();
    vi.mocked(checkAccess).mockReset();
  });

  it("rejects an invalid email without touching Supabase", async () => {
    const result = await requestMagicLink(formDataWith("not-an-email"));

    expect(result.success).toBe(false);
    expect(checkAccess).not.toHaveBeenCalled();
  });

  it("rejects an email with no access grant, without generating a token", async () => {
    vi.mocked(checkAccess).mockResolvedValue(false);

    const result = await requestMagicLink(formDataWith("stranger@example.com"));

    expect(result).toEqual({ success: false, error: "We don't have access on file for that email." });
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  it("redirects to /dashboard when the token verifies successfully", async () => {
    vi.mocked(checkAccess).mockResolvedValue(true);
    vi.mocked(createAdminClient).mockReturnValue({
      auth: {
        admin: {
          generateLink: vi.fn(async () => ({
            data: { properties: { hashed_token: "abc123" } },
            error: null,
          })),
        },
      },
    } as never);
    vi.mocked(createClient).mockResolvedValue({
      auth: { verifyOtp: vi.fn(async () => ({ error: null })) },
    } as never);

    await expect(requestMagicLink(formDataWith("student@example.com"))).rejects.toThrow(RedirectSignal);

    expect(redirect).toHaveBeenCalledWith("/dashboard");
  });

  it("surfaces a generateLink error gracefully, without attempting to verify", async () => {
    vi.mocked(checkAccess).mockResolvedValue(true);
    const verifyOtp = vi.fn();
    vi.mocked(createAdminClient).mockReturnValue({
      auth: {
        admin: {
          generateLink: vi.fn(async () => ({ data: null, error: { message: "Rate limit exceeded" } })),
        },
      },
    } as never);
    vi.mocked(createClient).mockResolvedValue({ auth: { verifyOtp } } as never);

    const result = await requestMagicLink(formDataWith("student@example.com"));

    expect(result).toEqual({ success: false, error: "Rate limit exceeded" });
    expect(verifyOtp).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("surfaces a verifyOtp error gracefully", async () => {
    vi.mocked(checkAccess).mockResolvedValue(true);
    vi.mocked(createAdminClient).mockReturnValue({
      auth: {
        admin: {
          generateLink: vi.fn(async () => ({
            data: { properties: { hashed_token: "abc123" } },
            error: null,
          })),
        },
      },
    } as never);
    vi.mocked(createClient).mockResolvedValue({
      auth: { verifyOtp: vi.fn(async () => ({ error: { message: "Token expired" } })) },
    } as never);

    const result = await requestMagicLink(formDataWith("student@example.com"));

    expect(result).toEqual({ success: false, error: "Token expired" });
    expect(redirect).not.toHaveBeenCalled();
  });

  it("returns a graceful error instead of throwing when Supabase is unreachable", async () => {
    // Regression for a real bug hit in Phase 4: this action must always
    // resolve to a MagicLinkResult on failure — LoginForm awaits it directly
    // with no try/catch of its own. An uncaught exception here used to
    // surface as Next's generic full-page error boundary on submit.
    vi.mocked(checkAccess).mockRejectedValue(new Error("network unreachable"));

    const result = await requestMagicLink(formDataWith("student@example.com"));

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });
});
