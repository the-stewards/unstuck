import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { buildLeadEvent, hashEmail, isMetaCapiConfigured, personEventId, sendMetaLead } from "@/lib/meta-capi";

const fetchMock = vi.fn();

const input = {
  eventId: "lead-uuid-1",
  email: "  Jane@Example.com ",
  ip: "203.0.113.9",
  userAgent: "Mozilla/5.0 test",
  eventTime: 1_700_000_000,
};

describe("Meta CAPI Lead", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    process.env.META_DATASET_ID = "1143269531578598";
    process.env.META_CAPI_TOKEN = "test-token-123";
    delete process.env.META_TEST_EVENT_CODE;
    process.env.NEXT_PUBLIC_APP_URL = "https://unstuck.stewards.loan";
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("hashes the lowercase, trimmed email with SHA-256 (hex)", () => {
    expect(hashEmail("  Jane@Example.com ")).toBe(createHash("sha256").update("jane@example.com").digest("hex"));
  });

  it("derives one stable event id per person, regardless of email case or spacing", () => {
    expect(personEventId(" Jane@Example.com ")).toBe(personEventId("jane@example.com"));
    expect(personEventId("jane@example.com")).toMatch(/^lead_[0-9a-f]{32}$/);
    expect(personEventId("jane@example.com")).not.toBe(personEventId("joe@example.com"));
    expect(personEventId("jane@example.com")).not.toContain("jane");
  });

  it("builds a Lead with only the allowed fields: no custom_data, bare origin, hashed email", () => {
    const event = buildLeadEvent(input);
    expect(event).toEqual({
      event_name: "Lead",
      event_time: 1_700_000_000,
      event_id: "lead-uuid-1",
      action_source: "website",
      event_source_url: "https://unstuck.stewards.loan",
      user_data: {
        em: hashEmail("jane@example.com"),
        client_ip_address: "203.0.113.9",
        client_user_agent: "Mozilla/5.0 test",
      },
    });
    expect(event).not.toHaveProperty("custom_data");
    expect(JSON.stringify(event)).not.toContain("jane");
  });

  it("uses only the origin even if the app URL carries a path or query", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://unstuck.stewards.loan/some/path?ref=meta";
    expect(buildLeadEvent(input).event_source_url).toBe("https://unstuck.stewards.loan");
  });

  it("leaves out the IP when none was available ('unknown' placeholder) and the UA when empty", () => {
    const event = buildLeadEvent({ ...input, ip: "unknown", userAgent: "" });
    expect(event.user_data).toEqual({ em: hashEmail("jane@example.com") });
  });

  it("posts to the dataset's /events endpoint on a current Graph version, with the token in the body, not the URL", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({ events_received: 1 }) });
    expect(await sendMetaLead(input)).toBe(true);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/^https:\/\/graph\.facebook\.com\/v\d+\.\d+\/1143269531578598\/events$/);
    expect(String(url)).not.toContain("test-token-123");
    const body = JSON.parse(init.body);
    expect(body.access_token).toBe("test-token-123");
    expect(body.data).toHaveLength(1);
    expect(body.data[0].event_name).toBe("Lead");
    expect(body).not.toHaveProperty("test_event_code");
  });

  it("includes the test event code only when set", async () => {
    process.env.META_TEST_EVENT_CODE = "TEST12345";
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({ events_received: 1 }) });
    await sendMetaLead(input);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).test_event_code).toBe("TEST12345");
  });

  it("sends nothing when the token or dataset id is missing", async () => {
    delete process.env.META_CAPI_TOKEN;
    expect(isMetaCapiConfigured()).toBe(false);
    expect(await sendMetaLead(input)).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns false (never throws) when Meta rejects the event, and does not log the token or email", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    fetchMock.mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: { message: "Invalid parameter", code: 100, type: "OAuthException" } }),
    });
    expect(await sendMetaLead(input)).toBe(false);
    const logged = JSON.stringify(errorSpy.mock.calls);
    expect(logged).toContain("Invalid parameter");
    expect(logged).not.toContain("test-token-123");
    expect(logged).not.toContain("jane");
  });

  it("returns false when Meta says it received something other than exactly one event", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({ events_received: 0 }) });
    expect(await sendMetaLead(input)).toBe(false);
  });

  it("returns false (never throws) on a network error or timeout", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    fetchMock.mockRejectedValue(new DOMException("timed out", "TimeoutError"));
    expect(await sendMetaLead(input)).toBe(false);
  });
});
