import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/access", () => ({ grantAccess: vi.fn(), getAccessGrant: vi.fn() }));
vi.mock("@/lib/notify", () => ({ sendAccessGrantedEmail: vi.fn() }));
// requireAdminEmail (used by lib/action-result.ts's runAdminAction) has to
// keep real behavior here, built from the mocked isAdminEmail + the
// separately-mocked createClient above — otherwise runAdminAction can't be
// exercised at all, since the real implementation now lives in lib/admin.ts
// rather than being duplicated per action file.
vi.mock("@/lib/admin", async () => {
  const isAdminEmail = vi.fn();
  return {
    isAdminEmail,
    requireAdminEmail: async () => {
      const { createClient } = await import("@/lib/supabase/server");
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.email || !isAdminEmail(user.email)) {
        throw new Error("Not authorized.");
      }
      return user.email;
    },
  };
});

import { createClient } from "@/lib/supabase/server";
import { grantAccess, getAccessGrant } from "@/lib/access";
import { sendAccessGrantedEmail } from "@/lib/notify";
import { isAdminEmail } from "@/lib/admin";
import { checkExistingAccess, grantManualAccess } from "@/app/actions/admin";

function mockSession(email: string | null) {
  vi.mocked(createClient).mockResolvedValue({
    auth: { getUser: vi.fn(async () => ({ data: { user: email ? { email } : null } })) },
  } as never);
}

describe("admin actions", () => {
  beforeEach(() => {
    vi.mocked(createClient).mockReset();
    vi.mocked(isAdminEmail).mockReset();
    vi.mocked(grantAccess).mockReset();
    vi.mocked(getAccessGrant).mockReset();
    vi.mocked(sendAccessGrantedEmail).mockReset();
  });

  it("rejects a non-admin caller", async () => {
    // Next.js masks thrown Server Action errors in production, so failures
    // are returned as data ({success: false}) rather than thrown — this is
    // what makes "Not authorized" actually reach the UI instead of a
    // generic digest-only error. See lib/action-result.ts.
    mockSession("nobody@example.com");
    vi.mocked(isAdminEmail).mockReturnValue(false);

    const result = await checkExistingAccess("student@example.com");

    expect(result).toEqual({ success: false, error: "Not authorized." });
  });

  it("rejects a signed-out caller", async () => {
    mockSession(null);

    const result = await checkExistingAccess("student@example.com");

    expect(result).toEqual({ success: false, error: "Not authorized." });
  });

  it("does not send a second email when the student already has access", async () => {
    // This is the "already purchased" check the spec requires so a sales
    // call never results in an accidental double-grant.
    mockSession("ryan@stewards.loan");
    vi.mocked(isAdminEmail).mockReturnValue(true);
    vi.mocked(grantAccess).mockResolvedValue({ granted: false, alreadyGranted: true });

    const result = await grantManualAccess("student@example.com");

    expect(result).toEqual({ success: true, data: { granted: false, alreadyGranted: true } });
    expect(sendAccessGrantedEmail).not.toHaveBeenCalled();
  });

  it("sends exactly one access email on a genuine new grant", async () => {
    mockSession("ryan@stewards.loan");
    vi.mocked(isAdminEmail).mockReturnValue(true);
    vi.mocked(grantAccess).mockResolvedValue({ granted: true, alreadyGranted: false });

    const result = await grantManualAccess("Student@Example.com");

    expect(result).toEqual({ success: true, data: { granted: true, alreadyGranted: false } });
    expect(grantAccess).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "student@example.com",
        source: "manual_comp",
        grantedBy: "ryan@stewards.loan",
      })
    );
    expect(sendAccessGrantedEmail).toHaveBeenCalledTimes(1);
    expect(sendAccessGrantedEmail).toHaveBeenCalledWith("student@example.com");
  });
});
