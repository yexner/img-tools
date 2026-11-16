export type Fill = 'white' | 'black' | 'transparent' | 'custom';

export interface Sides {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface Options {
  /** One thickness for every side, or `null` to use `each`. */
  all: number | null;
  each: Sides;
  fill: Fill;
  custom: string;
}

const px = (n: number | undefined) => Math.max(0, Math.round(Number(n) || 0));

export function sidesOf(o: Options): Sides {
  if (o.all !== null) {
    const n = px(o.all);
    return { top: n, right: n, bottom: n, left: n };
  }
  return {
    top: px(o.each.top),
    right: px(o.each.right),
    bottom: px(o.each.bottom),
    left: px(o.each.left),
  };
}

/** CSS color for the border, or null for transparent. */
export function colorOf(o: Pick<Options, 'fill' | 'custom'>): string | null {
  switch (o.fill) {
    case 'white':
      return '#ffffff';
    case 'black':
      return '#000000';
    case 'transparent':
      return null;
    default:
      return o.custom;
  }
}

export const total = (s: Sides) => s.top + s.right + s.bottom + s.left;

/** Size of the result for a picture of the given size. */
export const grown = (w: number, h: number, s: Sides) => ({
  width: w + s.left + s.right,
  height: h + s.top + s.bottom,
});
