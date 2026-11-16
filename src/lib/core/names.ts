const RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;

/** Make a single file-name part safe for downloads and ZIP entries. */
export function safeName(name: string): string {
  const cleaned = name
    .replace(/[\\/]+/g, '_') // path separators
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f<>:"|?*]/g, '_') // control and Windows-forbidden characters
    .replace(/^\.+/, '') // leading dots (also removes ".." entries)
    .replace(/[. ]+$/, '')
    .trim();
  const base = cleaned || 'file';
  return RESERVED.test(base) ? '_' + base : base;
}

export function splitName(name: string): { stem: string; ext: string } {
  const flat = safeName(name.split(/[\\/]/).pop() ?? name);
  const dot = flat.lastIndexOf('.');
  return dot > 0 ? { stem: flat.slice(0, dot), ext: flat.slice(dot + 1) } : { stem: flat, ext: '' };
}

const MAX_STEM = 100;

/**
 * Output name derived from the input name: `holiday.heic` + `compressed` + `jpg` → `holiday-compressed.jpg`.
 * `taken` holds names already used in this batch; the chosen name is added to it.
 */
export function uniqueName(
  input: string,
  suffix: string | undefined,
  ext: string,
  taken: Set<string>,
): string {
  const { stem } = splitName(input);
  const base =
    (suffix ? `${stem.slice(0, MAX_STEM)}-${safeName(suffix)}` : stem.slice(0, MAX_STEM)) || 'file';
  let candidate = `${base}.${ext}`;
  for (let n = 2; taken.has(candidate.toLowerCase()); n++) candidate = `${base}-${n}.${ext}`;
  taken.add(candidate.toLowerCase());
  return candidate;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1000) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let v = bytes / 1000;
  let i = 0;
  while (v >= 1000 && i < units.length - 1) {
    v /= 1000;
    i++;
  }
  return `${v >= 100 ? v.toFixed(0) : v >= 10 ? v.toFixed(1) : v.toFixed(2).replace(/\.?0+$/, '')} ${units[i]}`;
}

/** Signed percentage change, for example `-75%` or `+4%`. */
export function percentChange(before: number, after: number): string {
  if (before <= 0) return '0%';
  const p = Math.round(((after - before) / before) * 100);
  return `${p > 0 ? '+' : p < 0 ? '−' : ''}${Math.abs(p)}%`;
}
