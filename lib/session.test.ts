import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

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

const getUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ auth: { getUser } })),
}));

const checkAccess = vi.fn();
const grantAccess = vi.fn();
vi.mock("@/lib/access", () => ({
  checkAccess: (...a: unknown[]) => checkAccess(...a),
  grantAccess: (...a: unknown[]) => grantAccess(...a),
}));
vi.mock("@/lib/admin", () => ({ isAdminEmail: () => false }));

import { redirect } from "next/navigation";
import { requireStudent } from "@/lib/session";

describe("requireStudent (UNSTUCK is free)", () => {
  beforeEach(() => {
    vi.mocked(redirect).mockClear();
    getUser.mockReset();
    checkAccess.mockReset();
    grantAccess.mockReset();
    grantAccess.mockResolvedValue({ granted: true, alreadyGranted: false });
  });

  it("sends a signed-out visitor to /login", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    await expect(requireStudent()).rejects.toThrow(RedirectSignal);
    expect(redirect).toHaveBeenCalledWith("/login");
    expect(grantAccess).not.toHaveBeenCalled();
  });

  it("lets someone who already has access straight in, without granting again", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1", email: "student@example.com" } } });
    checkAccess.mockResolvedValue(true);
    const user = await requireStudent();
    expect(user.id).toBe("u1");
    expect(grantAccess).not.toHaveBeenCalled();
  });

  it("grants free access to a signed-in user with no grant, and never sends them to /purchase", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u2", email: "new@example.com" } } });
    checkAccess.mockResolvedValue(false);
    const user = await requireStudent();
    expect(user.id).toBe("u2");
    expect(grantAccess).toHaveBeenCalledWith({ email: "new@example.com", source: "free_signup" });
    expect(redirect).not.toHaveBeenCalled();
  });

  it("sends them back to /login (not an error page, not /purchase) if the grant fails", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u3", email: "new@example.com" } } });
    checkAccess.mockResolvedValue(false);
    grantAccess.mockRejectedValue(new Error("constraint violation"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(requireStudent()).rejects.toThrow(RedirectSignal);
    expect(redirect).toHaveBeenCalledWith("/login");
    expect(redirect).not.toHaveBeenCalledWith("/purchase");
  });
});
