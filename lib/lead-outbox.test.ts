import { beforeEach, describe, expect, it, vi } from "vitest";

interface Row {
  id: string;
  lead_id: string;
  event: string;
  payload: Record<string, unknown>;
  attempts: number;
  sent_at: string | null;
  created_at: string;
}

let rows: Row[] = [];

// Minimal in-memory stand-in for the supabase-js query chain used by
// lib/lead-outbox.ts (select/update + eq/is/lt/order/limit, awaited).
function table() {
  const filters: ((r: Row) => boolean)[] = [];
  let patch: Partial<Row> | null = null;
  let limit = Infinity;
  const builder = {
    select: () => builder,
    update: (p: Partial<Row>) => ((patch = p), builder),
    eq: (col: keyof Row, val: unknown) => (filters.push((r) => r[col] === val), builder),
    is: (col: keyof Row, val: unknown) => (filters.push((r) => r[col] === val), builder),
    lt: (col: keyof Row, val: number) => (filters.push((r) => (r[col] as number) < val), builder),
    order: () => builder,
    limit: (n: number) => ((limit = n), builder),
    then(resolve: (v: { data: Row[]; error: null }) => void) {
      const matched = rows.filter((r) => filters.every((f) => f(r))).slice(0, limit);
      if (patch) matched.forEach((r) => Object.assign(r, patch));
      resolve({ data: matched.map((r) => ({ ...r })), error: null });
    },
  };
  return builder;
}

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ from: () => table() }) }));
const alertMock = vi.fn();
vi.mock("@/lib/notify", () => ({ sendAdminAlert: (...a: unknown[]) => alertMock(...a) }));

import { flushLeadOutbox } from "@/lib/lead-outbox";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

function row(over: Partial<Row> = {}): Row {
  return {
    id: "o1",
    lead_id: "l1",
    event: "new_lead",
    payload: {
      form_key: "webinar",
      first_name: "Jane",
      last_name: "Doe",
      email: "jane@example.com",
      phone: "6145550123",
      sms_consent: true,
      ref: null,
      created_at: "2026-09-30T12:00:00Z",
    },
    attempts: 0,
    sent_at: null,
    created_at: "2026-09-30T12:00:00Z",
    ...over,
  };
}

describe("flushLeadOutbox", () => {
  beforeEach(() => {
    rows = [];
    fetchMock.mockReset();
    alertMock.mockReset();
    process.env.ZAPIER_LEADS_WEBHOOK_URL = "https://hooks.zapier.com/hooks/catch/1/abc/";
  });

  it("does nothing (rows stay queued) when no webhook URL is configured", async () => {
    delete process.env.ZAPIER_LEADS_WEBHOOK_URL;
    rows = [row()];
    expect(await flushLeadOutbox()).toEqual({ sent: 0, failed: 0, skipped: true });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(rows[0].sent_at).toBeNull();
  });

  it("posts a flat JSON payload to Zapier and marks the row sent", async () => {
    rows = [row()];
    fetchMock.mockResolvedValue({ ok: true, status: 200 });

    const result = await flushLeadOutbox();
    expect(result).toEqual({ sent: 1, failed: 0, skipped: false });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://hooks.zapier.com/hooks/catch/1/abc/");
    expect(JSON.parse(init.body)).toMatchObject({
      event: "new_lead",
      lead_id: "l1",
      form_key: "webinar",
      first_name: "Jane",
      last_name: "Doe",
      email: "jane@example.com",
      phone: "6145550123",
      sms_consent: true,
      event_name: "Unstuck Live Training",
      event_date: "Every Thursday at 12:00 PM ET",
      next_session: "This Thursday, October 1 at 12:00 PM ET", // RSVP created Wed 2026-09-30
    });
    expect(rows[0].sent_at).not.toBeNull();
  });

  it("leaves a failed row unsent and counts the attempt, so a later flush retries it", async () => {
    rows = [row()];
    fetchMock.mockResolvedValue({ ok: false, status: 500 });
    expect(await flushLeadOutbox()).toMatchObject({ sent: 0, failed: 1 });
    expect(rows[0]).toMatchObject({ attempts: 1, sent_at: null });

    fetchMock.mockResolvedValue({ ok: true, status: 200 });
    expect(await flushLeadOutbox()).toMatchObject({ sent: 1, failed: 0 });
    expect(rows[0].sent_at).not.toBeNull();
  });

  it("survives a network error/timeout without throwing", async () => {
    rows = [row()];
    fetchMock.mockRejectedValue(new Error("timeout"));
    await expect(flushLeadOutbox()).resolves.toMatchObject({ failed: 1 });
  });

  it("stops retrying after 5 attempts and alerts an admin exactly when it gives up", async () => {
    rows = [row({ attempts: 4 })];
    fetchMock.mockResolvedValue({ ok: false, status: 500 });
    await flushLeadOutbox();
    expect(alertMock).toHaveBeenCalledTimes(1);
    expect(rows[0].attempts).toBe(5);

    fetchMock.mockClear();
    await flushLeadOutbox();
    expect(fetchMock).not.toHaveBeenCalled(); // attempts >= 5: no longer eligible
  });

  it("does not resend an already-sent row, and leadId limits the flush to that lead", async () => {
    rows = [
      row({ id: "o1", lead_id: "l1", sent_at: "2026-09-30T12:01:00Z" }),
      row({ id: "o2", lead_id: "l2" }),
      row({ id: "o3", lead_id: "l3" }),
    ];
    fetchMock.mockResolvedValue({ ok: true, status: 200 });
    await flushLeadOutbox({ leadId: "l2" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).lead_id).toBe("l2");
    expect(rows.find((r) => r.id === "o3")?.sent_at).toBeNull();
  });

  it("two concurrent flushes never send the same row twice (claim lock)", async () => {
    rows = [row()];
    fetchMock.mockResolvedValue({ ok: true, status: 200 });
    await Promise.all([flushLeadOutbox({ leadId: "l1" }), flushLeadOutbox({ limit: 5 })]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
