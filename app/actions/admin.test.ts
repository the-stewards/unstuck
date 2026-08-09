import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/access", () => ({ grantAccess: vi.fn(), getAccessGrant: vi.fn() }));
vi.mock("@/lib/notify", () => ({ sendAccessGrantedEmail: vi.fn() }));
vi.mock("@/lib/admin", () => ({ isAdminEmail: vi.fn() }));

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
    mockSession("nobody@example.com");
    vi.mocked(isAdminEmail).mockReturnValue(false);

    await expect(checkExistingAccess("student@example.com")).rejects.toThrow("Not authorized");
  });

  it("rejects a signed-out caller", async () => {
    mockSession(null);

    await expect(checkExistingAccess("student@example.com")).rejects.toThrow("Not authorized");
  });

  it("does not send a second email when the student already has access", async () => {
    // This is the "already purchased" check the spec requires so a sales
    // call never results in an accidental double-grant.
    mockSession("ryan@stewards.loan");
    vi.mocked(isAdminEmail).mockReturnValue(true);
    vi.mocked(grantAccess).mockResolvedValue({ granted: false, alreadyGranted: true });

    const result = await grantManualAccess("student@example.com");

    expect(result).toEqual({ granted: false, alreadyGranted: true });
    expect(sendAccessGrantedEmail).not.toHaveBeenCalled();
  });

  it("sends exactly one access email on a genuine new grant", async () => {
    mockSession("ryan@stewards.loan");
    vi.mocked(isAdminEmail).mockReturnValue(true);
    vi.mocked(grantAccess).mockResolvedValue({ granted: true, alreadyGranted: false });

    const result = await grantManualAccess("Student@Example.com");

    expect(result.granted).toBe(true);
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
