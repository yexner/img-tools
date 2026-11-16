// Fitting text into a box: wrapping lines and choosing the biggest font size that fits.

export interface Fit {
  size: number;
  lines: string[];
  /** True when the text had to be cut short even at the smallest size. */
  cut: boolean;
}

export interface FitOptions {
  maxWidth: number;
  maxHeight: number;
  maxSize: number;
  minSize: number;
  maxLines: number;
  lineHeight: number;
  /** Width of a piece of text at a font size. */
  measure: (text: string, size: number) => number;
}

/** Break text into lines no wider than `maxWidth`; a single word that is too wide is broken by letters. */
export function wrap(
  text: string,
  size: number,
  o: Pick<FitOptions, 'maxWidth' | 'measure'>,
): string[] {
  const lines: string[] = [];
  let line = '';
  const push = (s: string) => lines.push(s);
  for (const word of text.split(/\s+/).filter(Boolean)) {
    let w = word;
    while (o.measure(w, size) > o.maxWidth && w.length > 1) {
      let n = w.length - 1;
      while (n > 1 && o.measure(w.slice(0, n), size) > o.maxWidth) n--;
      if (line) {
        push(line);
        line = '';
      }
      push(w.slice(0, n));
      w = w.slice(n);
    }
    const next = line ? `${line} ${w}` : w;
    if (o.measure(next, size) <= o.maxWidth) line = next;
    else {
      push(line);
      line = w;
    }
  }
  if (line) push(line);
  return lines;
}

/** The biggest font size at which the text fits the box; shorter than that only at the smallest size. */
export function fitText(text: string, o: FitOptions): Fit {
  if (!text.trim()) return { size: o.maxSize, lines: [], cut: false };
  for (let size = o.maxSize; size >= o.minSize; size -= 2) {
    const lines = wrap(text, size, o);
    if (lines.length <= o.maxLines && lines.length * size * o.lineHeight <= o.maxHeight) {
      return { size, lines, cut: false };
    }
  }
  const size = o.minSize;
  const all = wrap(text, size, o);
  const fits = Math.max(1, Math.min(o.maxLines, Math.floor(o.maxHeight / (size * o.lineHeight))));
  const lines = all.slice(0, fits);
  if (all.length > fits) {
    let last = lines[fits - 1];
    while (last.length > 1 && o.measure(last + '…', size) > o.maxWidth) last = last.slice(0, -1);
    lines[fits - 1] = last.trimEnd() + '…';
  }
  return { size, lines, cut: all.length > fits };
}
