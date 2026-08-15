import { beforeEach, describe, expect, it, vi } from "vitest";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStalledStudents } from "@/lib/nudges";

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));

const NOW = new Date("2026-08-15T12:00:00Z");
const days = (n: number) => new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000).toISOString();

function mockSupabase({
  modules,
  progress,
  students,
}: {
  modules: { id: string }[];
  progress: { student_id: string; status: string; updated_at: string }[];
  students: { id: string; email: string; last_nudged_at: string | null }[];
}) {
  const from = vi.fn((table: string) => {
    if (table === "modules") {
      return { select: vi.fn(() => ({ eq: vi.fn(async () => ({ data: modules, error: null })) })) };
    }
    if (table === "progress") {
      return { select: vi.fn(async () => ({ data: progress, error: null })) };
    }
    if (table === "students") {
      return { select: vi.fn(async () => ({ data: students, error: null })) };
    }
    throw new Error(`unexpected table: ${table}`);
  });
  return { from };
}

describe("getStalledStudents", () => {
  beforeEach(() => {
    vi.mocked(createAdminClient).mockReset();
  });

  it("excludes a student who never started", async () => {
    const client = mockSupabase({
      modules: [{ id: "m1" }, { id: "m2" }],
      progress: [],
      students: [{ id: "s1", email: "never@example.com", last_nudged_at: null }],
    });
    vi.mocked(createAdminClient).mockReturnValue(client as never);

    expect(await getStalledStudents(NOW)).toEqual([]);
  });

  it("excludes a student who already finished every published module", async () => {
    const client = mockSupabase({
      modules: [{ id: "m1" }],
      progress: [{ student_id: "s1", status: "complete", updated_at: days(10) }],
      students: [{ id: "s1", email: "done@example.com", last_nudged_at: null }],
    });
    vi.mocked(createAdminClient).mockReturnValue(client as never);

    expect(await getStalledStudents(NOW)).toEqual([]);
  });

  it("excludes a student who was recently active", async () => {
    const client = mockSupabase({
      modules: [{ id: "m1" }, { id: "m2" }],
      progress: [{ student_id: "s1", status: "in_progress", updated_at: days(1) }],
      students: [{ id: "s1", email: "active@example.com", last_nudged_at: null }],
    });
    vi.mocked(createAdminClient).mockReturnValue(client as never);

    expect(await getStalledStudents(NOW)).toEqual([]);
  });

  it("excludes a student nudged within the cooldown window", async () => {
    const client = mockSupabase({
      modules: [{ id: "m1" }, { id: "m2" }],
      progress: [{ student_id: "s1", status: "in_progress", updated_at: days(10) }],
      students: [{ id: "s1", email: "recent-nudge@example.com", last_nudged_at: days(2) }],
    });
    vi.mocked(createAdminClient).mockReturnValue(client as never);

    expect(await getStalledStudents(NOW)).toEqual([]);
  });

  it("includes a stalled student never nudged before", async () => {
    const client = mockSupabase({
      modules: [{ id: "m1" }, { id: "m2" }],
      progress: [{ student_id: "s1", status: "in_progress", updated_at: days(10) }],
      students: [{ id: "s1", email: "stalled@example.com", last_nudged_at: null }],
    });
    vi.mocked(createAdminClient).mockReturnValue(client as never);

    expect(await getStalledStudents(NOW)).toEqual([{ id: "s1", email: "stalled@example.com" }]);
  });

  it("includes a stalled student whose last nudge is outside the cooldown window", async () => {
    const client = mockSupabase({
      modules: [{ id: "m1" }, { id: "m2" }],
      progress: [{ student_id: "s1", status: "in_progress", updated_at: days(10) }],
      students: [{ id: "s1", email: "stale-nudge@example.com", last_nudged_at: days(9) }],
    });
    vi.mocked(createAdminClient).mockReturnValue(client as never);

    expect(await getStalledStudents(NOW)).toEqual([{ id: "s1", email: "stale-nudge@example.com" }]);
  });

  it("uses each student's most recent progress row, not their oldest", async () => {
    const client = mockSupabase({
      modules: [{ id: "m1" }, { id: "m2" }],
      progress: [
        { student_id: "s1", status: "in_progress", updated_at: days(10) },
        { student_id: "s1", status: "in_progress", updated_at: days(1) },
      ],
      students: [{ id: "s1", email: "mixed@example.com", last_nudged_at: null }],
    });
    vi.mocked(createAdminClient).mockReturnValue(client as never);

    expect(await getStalledStudents(NOW)).toEqual([]);
  });
});
