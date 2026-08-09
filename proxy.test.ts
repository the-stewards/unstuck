import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => {
    throw new Error("Your project's URL and Key are required to create a Supabase client!");
  }),
}));

describe("proxy (regression)", () => {
  it("still returns a response when Supabase client creation throws", async () => {
    // Regression for a real bug hit in Phase 3: proxy.ts runs on every
    // request (per its matcher), and had no error handling around session
    // refresh — any Supabase failure (missing config, network blip, bad
    // cookie) 500'd every single page, including pages needing no session
    // at all, like /login. Session refresh must be best-effort.
    const { proxy } = await import("@/proxy");
    const request = new NextRequest("http://localhost:3000/login");

    const response = await proxy(request);

    expect(response).toBeDefined();
    expect(response.headers).toBeDefined();
  });
});
