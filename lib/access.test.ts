import { beforeEach, describe, expect, it, vi } from "vitest";
import { createAdminClient } from "@/lib/supabase/admin";
import { grantAccess } from "@/lib/access";

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

function mockSupabase({
  existing = null,
  insertError = null,
}: {
  existing?: unknown;
  insertError?: { code: string; message: string } | null;
}) {
  const insert = vi.fn(async () => ({ error: insertError }));
  const maybeSingle = vi.fn(async () => ({ data: existing, error: null }));
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select, insert }));
  return { from, insert, maybeSingle };
}

describe("grantAccess", () => {
  beforeEach(() => {
    vi.mocked(createAdminClient).mockReset();
  });

  it("creates a new grant when no existing row is found", async () => {
    const client = mockSupabase({ existing: null, insertError: null });
    vi.mocked(createAdminClient).mockReturnValue(client as never);

    const result = await grantAccess({ email: "New@Example.com", source: "manual_comp" });

    expect(result).toEqual({ granted: true, alreadyGranted: false });
    expect(client.insert).toHaveBeenCalledWith(
      expect.objectContaining({ email: "new@example.com", source: "manual_comp" })
    );
  });

  it("does not insert when a grant already exists (check-then-insert)", async () => {
    const client = mockSupabase({
      existing: { email: "student@example.com", source: "stripe_purchase" },
    });
    vi.mocked(createAdminClient).mockReturnValue(client as never);

    const result = await grantAccess({ email: "student@example.com", source: "manual_comp" });

    expect(result).toEqual({ granted: false, alreadyGranted: true });
    expect(client.insert).not.toHaveBeenCalled();
  });

  it("treats a unique-violation on insert as already-granted, not an error", async () => {
    // Simulates two calls racing (e.g. a retried Stripe webhook landing
    // concurrently with something else) — both pass the existence check,
    // then one insert loses to the unique(email) constraint.
    const client = mockSupabase({
      existing: null,
      insertError: { code: "23505", message: "duplicate key" },
    });
    vi.mocked(createAdminClient).mockReturnValue(client as never);

    const result = await grantAccess({ email: "race@example.com", source: "stripe_purchase" });

    expect(result).toEqual({ granted: false, alreadyGranted: true });
  });

  it("throws on a non-idempotency insert error", async () => {
    const client = mockSupabase({
      existing: null,
      insertError: { code: "23502", message: "not null violation" },
    });
    vi.mocked(createAdminClient).mockReturnValue(client as never);

    await expect(
      grantAccess({ email: "broken@example.com", source: "manual_comp" })
    ).rejects.toMatchObject({ code: "23502" });
  });
});
