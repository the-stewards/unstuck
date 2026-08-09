// Admin gate is a static ADMIN_EMAILS allowlist, not a staff table — the LMS
// only ever has two admins (Ryan, Chris), so a role/permissions system would
// be unused abstraction.
export function isAdminEmail(email: string): boolean {
  const allowlist = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  return allowlist.includes(email.trim().toLowerCase());
}
