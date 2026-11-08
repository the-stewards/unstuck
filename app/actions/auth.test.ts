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

describe("requestMagicLink: open signup (ALLOW_SIGNUP_LINKS)", () => {
  const signInWithOtp = vi.fn();

  function withRef(email: string, ref?: string) {
    const formData = formDataWith(email);
    if (ref !== undefined) formData.set("ref", ref);
    return formData;
  }

  beforeEach(() => {
    vi.mocked(redirect).mockClear();
    vi.mocked(createClient).mockReset();
    vi.mocked(createAdminClient).mockReset();
    vi.mocked(checkAccess).mockReset();
    signInWithOtp.mockReset();
    signInWithOtp.mockResolvedValue({ error: null });
    vi.mocked(createClient).mockResolvedValue({ auth: { signInWithOtp } } as never);
    vi.mocked(checkAccess).mockResolvedValue(false);
    process.env.NEXT_PUBLIC_APP_URL = "https://unstuck.stewards.loan";
  });

  it("is OFF by default: a stranger is turned away exactly as before and no email is sent", async () => {
    delete process.env.ALLOW_SIGNUP_LINKS;
    const result = await requestMagicLink(withRef("new@example.com", "meta"));
    expect(result).toEqual({ success: false, error: "We don't have access on file for that email." });
    expect(signInWithOtp).not.toHaveBeenCalled();
  });

  it("when ON, emails a real link to a new address and does not log them in instantly", async () => {
    process.env.ALLOW_SIGNUP_LINKS = "true";
    const result = await requestMagicLink(withRef("New@Example.com", "meta"));
    expect(result).toEqual({ success: true, emailed: true });
    expect(redirect).not.toHaveBeenCalled();
    expect(createAdminClient).not.toHaveBeenCalled(); // no admin-generated instant login
    const arg = signInWithOtp.mock.calls[0][0];
    expect(arg.email).toBe("new@example.com");
    expect(arg.options.shouldCreateUser).toBe(true);
    expect(arg.options.emailRedirectTo).toBe("https://unstuck.stewards.loan/auth/confirm?next=/dashboard");
  });

  it("stores the sanitized channel on the new user (reporting only) and omits it when absent", async () => {
    process.env.ALLOW_SIGNUP_LINKS = "true";
    await requestMagicLink(withRef("a@example.com", "ig<b>"));
    expect(signInWithOtp.mock.calls[0][0].options.data).toEqual({ signup_ref: "igb" });
    signInWithOtp.mockClear();
    await requestMagicLink(withRef("b@example.com"));
    expect(signInWithOtp.mock.calls[0][0].options).not.toHaveProperty("data");
  });

  it("returns a friendly error, not Supabase's message, when the email can't be sent", async () => {
    process.env.ALLOW_SIGNUP_LINKS = "true";
    signInWithOtp.mockResolvedValue({ error: { message: "email rate limit exceeded" } });
    const result = await requestMagicLink(withRef("c@example.com"));
    expect(result.success).toBe(false);
    expect(result.error).not.toMatch(/rate limit/i);
  });

  it("a granted student still gets the unchanged instant login even when signup links are ON", async () => {
    process.env.ALLOW_SIGNUP_LINKS = "true";
    vi.mocked(checkAccess).mockResolvedValue(true);
    vi.mocked(createAdminClient).mockReturnValue({
      auth: { admin: { generateLink: vi.fn(async () => ({ data: { properties: { hashed_token: "t" } }, error: null })) } },
    } as never);
    vi.mocked(createClient).mockResolvedValue({ auth: { verifyOtp: vi.fn(async () => ({ error: null })), signInWithOtp } } as never);
    await expect(requestMagicLink(withRef("student@example.com", "meta"))).rejects.toThrow(RedirectSignal);
    expect(signInWithOtp).not.toHaveBeenCalled();
    delete process.env.ALLOW_SIGNUP_LINKS;
  });
});
