import { clamp } from '#lib/core/math';

export type FontId = 'sans' | 'serif' | 'mono' | 'display';

export const FONTS: Record<FontId, { label: string; family: string }> = {
  sans: { label: 'Sans', family: '"Atkinson Hyperlegible Next", sans-serif' },
  serif: { label: 'Serif', family: '"Source Serif 4", serif' },
  mono: { label: 'Mono', family: '"JetBrains Mono", monospace' },
  display: { label: 'Display', family: '"Bricolage Grotesque", sans-serif' },
};

export interface Layer {
  id: number;
  text: string;
  font: FontId;
  /** Font size as a percentage of the picture's width. */
  size: number;
  color: string;
  weight: 400 | 700;
  align: 'left' | 'center' | 'right';
  shadow: boolean;
  box: boolean;
  boxColor: string;
  /** Center of the text, as fractions of the picture (0 to 1). */
  x: number;
  y: number;
}

export const newLayer = (id: number, n: number): Layer => ({
  id,
  text: 'Your text',
  font: 'display',
  size: 8,
  color: '#ffffff',
  weight: 700,
  align: 'center',
  shadow: true,
  box: false,
  boxColor: '#000000',
  // Each new layer starts a little lower, so it does not hide the one before it.
  x: 0.5,
  y: Math.min(0.85, 0.3 + n * 0.14),
});

export const fontCss = (l: Layer, px: number) => `${l.weight} ${px}px ${FONTS[l.font].family}`;

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

const LINE = 1.2;

/** The rectangle a layer covers, in the picture's pixels, including its box padding. */
export function layerBox(
  l: Layer,
  W: number,
  H: number,
  measure: (text: string, px: number) => number,
): Box {
  const px = (l.size / 100) * W;
  const lines = l.text.split('\n');
  const w = Math.max(...lines.map((line) => measure(line, px)), px * 0.5);
  const h = lines.length * px * LINE;
  const pad = l.box ? px * 0.3 : px * 0.05;
  return { x: l.x * W - w / 2 - pad, y: l.y * H - h / 2 - pad, w: w + 2 * pad, h: h + 2 * pad };
}

/** The topmost layer under a point, or null. Later layers are drawn on top. */
export function hitTest(boxes: Box[], x: number, y: number): number | null {
  for (let i = boxes.length - 1; i >= 0; i--) {
    const b = boxes[i];
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return i;
  }
  return null;
}

/** Move the layer at `index` one place up or down the list (up = drawn later, on top). */
export function reorder<T>(list: T[], index: number, by: -1 | 1): T[] {
  const to = index + by;
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  [next[index], next[to]] = [next[to], next[index]];
  return next;
}

export const clamp01 = (n: number) => clamp(n, 0, 1);
