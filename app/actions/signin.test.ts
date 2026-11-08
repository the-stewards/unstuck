import { beforeEach, describe, expect, it, vi } from "vitest";

const getUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ auth: { getUser } })),
}));
vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers({ "x-vercel-forwarded-for": "8.8.4.4, 10.0.0.1", "user-agent": "Browser/1" })),
}));

const report = vi.fn();
vi.mock("@/lib/meta-lead", () => ({ reportFirstVerifiedSignIn: (...a: unknown[]) => report(...a) }));

const afterCallbacks: Array<() => unknown> = [];
vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  after: (cb: () => unknown) => {
    afterCallbacks.push(cb);
  },
}));

import { recordVerifiedSignIn } from "@/app/actions/signin";

describe("recordVerifiedSignIn", () => {
  beforeEach(() => {
    getUser.mockReset();
    report.mockReset();
    report.mockResolvedValue(undefined);
    afterCallbacks.length = 0;
  });

  it("reads the user from the session (not from the caller) and schedules the report after the response", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1", email: "buyer@example.com", user_metadata: { signup_ref: "ig" } } } });
    await recordVerifiedSignIn();
    expect(report).not.toHaveBeenCalled();
    await afterCallbacks[0]();
    expect(report).toHaveBeenCalledWith({
      userId: "u1",
      email: "buyer@example.com",
      signupRef: "ig",
      ip: "8.8.4.4",
      userAgent: "Browser/1",
    });
  });

  it("does nothing when there is no signed-in user", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    await recordVerifiedSignIn();
    expect(afterCallbacks).toHaveLength(0);
  });

  it("never throws, even if reading the session fails", async () => {
    getUser.mockRejectedValue(new Error("auth down"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(recordVerifiedSignIn()).resolves.toBeUndefined();
  });
});
