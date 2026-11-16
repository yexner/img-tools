export type Mode = 'edge' | 'exact' | 'percent';

export interface Options {
  mode: Mode;
  /** Longest edge in px (mode `edge`). */
  edge: number;
  /** Exact size in px (mode `exact`). */
  width?: number;
  height?: number;
  /** Keep proportions: the side that was typed last decides, the other follows each picture. */
  lock: boolean;
  driving: 'w' | 'h';
  percent: number;
}

export interface Size {
  width: number;
  height: number;
}

/** Size a picture will have after resizing; the same arithmetic as the worker. */
export function targetSize(from: Size, o: Options): Size {
  const round = (n: number) => Math.max(1, Math.round(n));
  if (o.mode === 'percent') {
    return {
      width: round((from.width * o.percent) / 100),
      height: round((from.height * o.percent) / 100),
    };
  }
  if (o.mode === 'edge') {
    // Only shrinks: a picture that is already small enough stays as it is.
    const k = Math.min(1, o.edge / Math.max(from.width, from.height));
    return { width: round(from.width * k), height: round(from.height * k) };
  }
  const { width, height } = o;
  if (!o.lock && width && height) return { width: round(width), height: round(height) };
  if (o.driving === 'w' && width) {
    return { width: round(width), height: round((width * from.height) / from.width) };
  }
  if (height) return { width: round((height * from.width) / from.height), height: round(height) };
  return from;
}

/** The pipeline call for these options. */
export function stepFor(
  o: Options,
): { limit: number } | { scale: number } | { w?: number; h?: number } | null {
  if (o.mode === 'percent') return { scale: o.percent / 100 };
  if (o.mode === 'edge') return { limit: o.edge };
  if (!o.lock) return o.width && o.height ? { w: o.width, h: o.height } : null;
  return o.driving === 'w' ? (o.width ? { w: o.width } : null) : o.height ? { h: o.height } : null;
}

/** Whether the options describe a valid job. */
export const valid = (o: Options) =>
  stepFor(o) !== null &&
  (o.mode !== 'edge' || o.edge >= 1) &&
  (o.mode !== 'percent' || o.percent >= 1);
