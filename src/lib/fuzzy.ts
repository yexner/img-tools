/** Small fuzzy scorer for the command palette: higher is better, 0 means no match. */
export function score(query: string, text: string): number {
  const q = query.toLowerCase().trim();
  const t = text.toLowerCase();
  if (!q) return 1;
  const at = t.indexOf(q);
  if (at >= 0) return 100 - Math.min(at, 50) + (at === 0 || t[at - 1] === ' ' ? 20 : 0);
  let ti = 0;
  let s = 0;
  let streak = 0;
  for (const ch of q) {
    const found = t.indexOf(ch, ti);
    if (found < 0) return 0;
    streak = found === ti ? streak + 1 : 0;
    s += 1 + streak * 2 + (found === 0 || t[found - 1] === ' ' ? 3 : 0);
    ti = found + 1;
  }
  return s;
}

export function search<T>(query: string, items: T[], fields: (item: T) => string[]): T[] {
  return items
    .map((item) => {
      const [first, ...rest] = fields(item);
      const best = Math.max(score(query, first) * 3, ...rest.map((f) => score(query, f)));
      return { item, best };
    })
    .filter((x) => x.best > 0)
    .sort((a, b) => b.best - a.best)
    .map((x) => x.item);
}
