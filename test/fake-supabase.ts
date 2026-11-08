// Tiny in-memory stand-in for the supabase-js query builder, just enough for the
// queries the Meta lead code makes (select/update with eq, is, not, gte, order,
// limit). Rows live in plain arrays so tests can assert on the resulting state.

export type Row = Record<string, unknown>;
export type Tables = Record<string, Row[]>;

type Filter = (row: Row) => boolean;

export function createFakeSupabase(tables: Tables, opts: { failTables?: string[] } = {}) {
  function from(name: string) {
    const rows = (tables[name] ??= []);
    const filters: Filter[] = [];
    let patch: Row | null = null;
    let orderBy: { col: string; asc: boolean } | null = null;
    let max: number | null = null;

    const run = () => {
      if (opts.failTables?.includes(name)) return { data: null, error: new Error(`${name} unavailable`) };
      let matched = rows.filter((r) => filters.every((f) => f(r)));
      if (patch) {
        matched.forEach((r) => Object.assign(r, patch));
        return { data: matched, error: null };
      }
      if (orderBy) {
        const { col, asc } = orderBy;
        matched = [...matched].sort((a, b) => (String(a[col]) < String(b[col]) ? -1 : 1) * (asc ? 1 : -1));
      }
      if (max !== null) matched = matched.slice(0, max);
      return { data: matched, error: null };
    };

    const chain: Record<string, unknown> = {
      select: () => chain,
      update: (p: Row) => {
        patch = p;
        return chain;
      },
      eq: (col: string, v: unknown) => (filters.push((r) => r[col] === v), chain),
      is: (col: string, v: unknown) => (filters.push((r) => (v === null ? r[col] == null : r[col] === v)), chain),
      not: (col: string, op: string, v: unknown) => {
        if (op === "is" && v === null) filters.push((r) => r[col] != null);
        return chain;
      },
      gte: (col: string, v: unknown) => (filters.push((r) => String(r[col]) >= String(v)), chain),
      order: (col: string, o?: { ascending?: boolean }) => ((orderBy = { col, asc: o?.ascending !== false }), chain),
      limit: (n: number) => ((max = n), chain),
      then: (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) => Promise.resolve(run()).then(resolve, reject),
    };
    return chain;
  }
  return { from };
}
