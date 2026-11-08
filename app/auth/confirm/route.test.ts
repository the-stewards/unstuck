import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const exchange = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ auth: { exchangeCodeForSession: exchange } })),
}));

const report = vi.fn();
vi.mock("@/lib/meta-lead", () => ({ reportFirstVerifiedSignIn: (...a: unknown[]) => report(...a) }));

// next/server's after() needs a request scope; here we just run the callback so
// the test can see what it would do once the response is sent.
const afterCallbacks: Array<() => unknown> = [];
vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  after: (cb: () => unknown) => {
    afterCallbacks.push(cb);
  },
}));

import { GET } from "@/app/auth/confirm/route";

const req = (path: string, headers: Record<string, string> = {}) =>
  new NextRequest(`https://unstuck.stewards.loan${path}`, { headers });

describe("GET /auth/confirm", () => {
  beforeEach(() => {
    exchange.mockReset();
    report.mockReset();
    report.mockResolvedValue(undefined);
    afterCallbacks.length = 0;
  });

  it("redirects to ?next= on success and reports the first verified sign-in AFTER the response, with the channel from user metadata", async () => {
    exchange.mockResolvedValue({
      data: { user: { id: "u1", email: "new@example.com", user_metadata: { signup_ref: "meta" } } },
      error: null,
    });
    const res = await GET(req("/auth/confirm?code=abc&next=/dashboard", { "x-forwarded-for": "5.6.7.8", "user-agent": "Mail Browser" }));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("https://unstuck.stewards.loan/dashboard");

    expect(report).not.toHaveBeenCalled(); // scheduled, not run inline
    expect(afterCallbacks).toHaveLength(1);
    await afterCallbacks[0]();
    expect(report).toHaveBeenCalledWith({
      userId: "u1",
      email: "new@example.com",
      signupRef: "meta",
      ip: "5.6.7.8",
      userAgent: "Mail Browser",
    });
  });

  it("sign-in succeeds even if the Meta report would throw (it only runs after the redirect)", async () => {
    exchange.mockResolvedValue({ data: { user: { id: "u1", email: "a@example.com", user_metadata: {} } }, error: null });
    report.mockRejectedValue(new Error("meta down"));
    const res = await GET(req("/auth/confirm?code=abc"));
    expect(res.headers.get("location")).toBe("https://unstuck.stewards.loan/dashboard");
  });

  it("reports nothing and bounces to /login when the link is invalid", async () => {
    exchange.mockResolvedValue({ data: { user: null }, error: { message: "expired" } });
    const res = await GET(req("/auth/confirm?code=bad"));
    expect(res.headers.get("location")).toBe("https://unstuck.stewards.loan/login?error=invalid_link");
    expect(afterCallbacks).toHaveLength(0);
  });

  it("reports nothing when there is no code at all", async () => {
    const res = await GET(req("/auth/confirm"));
    expect(res.headers.get("location")).toBe("https://unstuck.stewards.loan/login?error=invalid_link");
    expect(exchange).not.toHaveBeenCalled();
    expect(afterCallbacks).toHaveLength(0);
  });

  it("still refuses an open redirect via ?next=", async () => {
    exchange.mockResolvedValue({ data: { user: { id: "u1", email: "a@example.com", user_metadata: {} } }, error: null });
    const res = await GET(req("/auth/confirm?code=abc&next=//evil.com"));
    expect(res.headers.get("location")).toBe("https://unstuck.stewards.loan/dashboard");
  });
});
