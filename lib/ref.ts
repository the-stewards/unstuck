// Channel tag from ?ref= (e.g. meta, ig, email). Kept in our own database for
// reporting only; never sent to Meta. Letters, numbers, dash, underscore; max 30.
export function sanitizeRef(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const clean = value.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 30);
  return clean || null;
}
