// Best-effort client IP from request headers, for Meta's match quality only.
// Returns null (never a placeholder) when no trustworthy value is available.
export function clientIp(headers: Pick<Headers, "get">): string | null {
  const raw =
    headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "";
  return raw || null;
}
