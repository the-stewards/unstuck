import { beforeEach, describe, expect, it, vi } from "vitest";

const rpcMock = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ rpc: rpcMock })),
}));

const emailMock = vi.fn();
vi.mock("@/lib/notify", () => ({
  sendLeadConfirmationEmail: (...args: unknown[]) => emailMock(...args),
}));

const flushMock = vi.fn();
vi.mock("@/lib/lead-outbox", () => ({ flushLeadOutbox: (...a: unknown[]) => flushMock(...a) }));

import { POST, OPTIONS } from "@/app/api/leads/route";

import { LEAD_FORMS } from "@/lib/lead-forms";

const valid = {
  consentText: LEAD_FORMS.webinar.consentText,
  form: "webinar",
  firstName: "Jane",
  lastName: "Doe",
  email: "Jane@Example.com",
  phone: "(614) 555-0123",
  smsConsent: true,
};

function req(body: unknown, raw = false) {
  return new Request("http://localhost/api/leads", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": "1.2.3.4", "user-agent": "vitest" },
    body: raw ? (body as string) : JSON.stringify(body),
  });
}

// hit_rate_limit -> false (not limited), submit_lead -> new id
function happyRpc() {
  rpcMock.mockImplementation(async (fn: string) =>
    fn === "hit_rate_limit" ? { data: false, error: null } : { data: "lead-uuid-1", error: null }
  );
}

function rpcWith(submit: { data: unknown; error: unknown }, limit: { data: unknown; error: unknown } = { data: false, error: null }) {
  rpcMock.mockImplementation(async (fn: string) => (fn === "hit_rate_limit" ? limit : submit));
}

describe("POST /api/leads", () => {
  beforeEach(() => {
    rpcMock.mockReset();
    emailMock.mockReset();
    flushMock.mockReset();
    flushMock.mockResolvedValue({ sent: 1, failed: 0, skipped: false });
    emailMock.mockResolvedValue(undefined);
    happyRpc();
  });

  it("saves a valid lead, normalizes email, and stores the SERVER's consent wording", async () => {
    const res = await POST(req(valid));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, leadId: "lead-uuid-1" });

    const call = rpcMock.mock.calls.find((c) => c[0] === "submit_lead")!;
    expect(call[1]).toMatchObject({
      p_form_key: "webinar",
      p_email: "Jane@Example.com",
      p_sms_consent: true,
      p_ip: "1.2.3.4",
      p_user_agent: "vitest",
    });
    expect(call[1].p_consent_text).toContain("reminders for Unstuck");
    expect(call[1].p_consent_text).not.toContain("client-supplied");
    expect(emailMock).toHaveBeenCalledWith(
      "jane@example.com",
      "Jane",
      expect.any(String),
      expect.stringMatching(/^(This|Next) Thursday at 12:00 PM ET$|^Today at 12:00 PM ET$/),
      { google: expect.stringContaining("calendar.google.com"), ics: expect.stringContaining("/api/leads/calendar?form=webinar") }
    );
  });

  it("rejects consent wording that differs from the server's (stale cached form)", async () => {
    const stale = await POST(req({ ...valid, consentText: "old wording" }));
    expect(stale.status).toBe(409);
    expect((await stale.json()).error).toMatch(/refresh/i);
    const missing = await POST(req({ ...valid, consentText: undefined }));
    expect(missing.status).toBe(409);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("skips the rate limit when no client IP is available (no shared 'unknown' bucket)", async () => {
    const r = new Request("http://localhost/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(valid),
    });
    expect((await POST(r)).status).toBe(200);
    expect(rpcMock.mock.calls.some((c) => c[0] === "hit_rate_limit")).toBe(false);
  });

  it("queues delivery to Zapier for the new lead, and a Zapier failure never fails the RSVP", async () => {
    const ok = await POST(req(valid));
    expect(ok.status).toBe(200);
    expect(flushMock).toHaveBeenCalledWith({ leadId: "lead-uuid-1" });

    flushMock.mockRejectedValue(new Error("zapier down"));
    const res = await POST(req({ ...valid, email: "other@example.com" }));
    expect(res.status).toBe(200);
  });

  it("stores a long attribution string truncated to 100 chars instead of rejecting the RSVP", async () => {
    const res = await POST(req({ ...valid, ref: "source=facebook&campaign=" + "x".repeat(300) }));
    expect(res.status).toBe(200);
    const call = rpcMock.mock.calls.find((c) => c[0] === "submit_lead")!;
    expect(call[1].p_ref).toHaveLength(100);
    expect(call[1].p_ref.startsWith("source=facebook&campaign=")).toBe(true);
  });

  it("honeypot: fakes success without touching the database or email", async () => {
    const res = await POST(req({ ...valid, website: "http://spam.example" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(rpcMock).not.toHaveBeenCalled();
    expect(emailMock).not.toHaveBeenCalled();
    expect(flushMock).not.toHaveBeenCalled();
  });

  it("enforces SMS consent server-side (the checkbox is only a client check)", async () => {
    const res = await POST(req({ ...valid, smsConsent: false }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/consent/i);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it.each([
    ["missing first name", { firstName: "" }],
    ["bad email", { email: "not-an-email" }],
    ["short phone", { phone: "12345" }],
  ])("rejects %s with 400 and no DB write", async (_name, patch) => {
    const res = await POST(req({ ...valid, ...patch }));
    expect(res.status).toBe(400);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("404s an unknown form key, including prototype keys", async () => {
    expect((await POST(req({ ...valid, form: "nope" }))).status).toBe(404);
    expect((await POST(req({ ...valid, form: "__proto__" }))).status).toBe(404);
    expect((await POST(req({ ...valid, form: "constructor" }))).status).toBe(404);
  });

  it("returns 400 JSON (not a crash) for a non-JSON body", async () => {
    const res = await POST(req("{not json", true));
    expect(res.status).toBe(400);
    expect(await res.json()).toHaveProperty("error");
  });

  it("maps a duplicate (unique violation 23505) to a friendly 409", async () => {
    rpcWith({ data: null, error: { code: "23505", message: "dup" } });
    const res = await POST(req(valid));
    expect(res.status).toBe(409);
    expect((await res.json()).error).toMatch(/already/i);
    expect(emailMock).not.toHaveBeenCalled();
  });

  it("returns 429 when over the rate limit, without inserting", async () => {
    rpcWith({ data: "x", error: null }, { data: true, error: null });
    const res = await POST(req(valid));
    expect(res.status).toBe(429);
    expect(rpcMock.mock.calls.some((c) => c[0] === "submit_lead")).toBe(false);
  });

  it("fails open if the rate limiter itself errors (form must stay up)", async () => {
    rpcWith({ data: "lead-1", error: null }, { data: null, error: { message: "fn missing" } });
    const res = await POST(req(valid));
    expect(res.status).toBe(200);
  });

  it("still returns 200 when the confirmation email fails (lead already saved)", async () => {
    emailMock.mockRejectedValue(new Error("resend down"));
    const res = await POST(req(valid));
    expect(res.status).toBe(200);
  });

  it("returns JSON 500 (never throws) on an unexpected database error", async () => {
    rpcWith({ data: null, error: { code: "XX000", message: "boom" } });
    const res = await POST(req(valid));
    expect(res.status).toBe(500);
    expect(await res.json()).toHaveProperty("error");
  });

  it("sends CORS headers on success, errors, and preflight", async () => {
    const ok = await POST(req(valid));
    const bad = await POST(req({ ...valid, firstName: "" }));
    const pre = await OPTIONS();
    for (const r of [ok, bad, pre]) expect(r.headers.get("access-control-allow-origin")).toBe("*");
    expect(pre.status).toBe(204);
  });
});
