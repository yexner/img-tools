// Photo filters as plain pixel maths, so a preview and a saved file look the same in every browser
// (no canvas filters). All of them work on RGBA arrays and can be tested in Node.
import type { Pixels } from './pixels';

export type Look = 'none' | 'warm' | 'cool' | 'vintage' | 'moody' | 'vivid' | 'bw';

export const LOOKS: Look[] = ['none', 'warm', 'cool', 'vintage', 'moody', 'vivid', 'bw'];

export interface FilterOptions {
  look: Look;
  /** 0 to 100: washed-out film look. */
  fade: number;
  /** 0 to 100: film-like noise. */
  grain: number;
  /** -100 to 100. */
  brightness: number;
  contrast: number;
  saturation: number;
}

export const noFilter: FilterOptions = {
  look: 'none',
  fade: 0,
  grain: 0,
  brightness: 0,
  contrast: 0,
  saturation: 0,
};

export const isIdentity = (o: FilterOptions) =>
  o.look === 'none' && !o.fade && !o.grain && !o.brightness && !o.contrast && !o.saturation;

const clamp = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : v);
const luma = (r: number, g: number, b: number) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

/** Number between 0 and 1 that depends only on the position, so grain is the same every time. */
export function noise(x: number, y: number, seed = 1): number {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(seed, 2147483647);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

type RGB = [number, number, number];

/** The color change of each look, for one pixel. */
function look(name: Look, r: number, g: number, b: number): RGB {
  switch (name) {
    case 'warm':
      return [r * 1.08 + 8, g * 1.02 + 2, b * 0.9 - 4];
    case 'cool':
      return [r * 0.92 - 2, g * 1.0 + 1, b * 1.1 + 8];
    case 'vintage': {
      // Sepia mixed with the original, blacks lifted a little, colors softened.
      const l = luma(r, g, b);
      const sr = l * 1.07 + 18;
      const sg = l * 0.95 + 10;
      const sb = l * 0.78 + 4;
      return [r * 0.45 + sr * 0.55 + 6, g * 0.45 + sg * 0.55 + 4, b * 0.45 + sb * 0.55 + 8];
    }
    case 'moody': {
      // Darker, less colorful, cool shadows and slightly warm highlights.
      const l = luma(r, g, b);
      const t = l / 255;
      const rr = (r * 0.75 + l * 0.25) * 0.9 + t * 10;
      const gg = (g * 0.75 + l * 0.25) * 0.9;
      const bb = (b * 0.75 + l * 0.25) * 0.92 + (1 - t) * 14;
      return [rr, gg, bb];
    }
    case 'vivid': {
      const l = luma(r, g, b);
      return [l + (r - l) * 1.35, l + (g - l) * 1.35, l + (b - l) * 1.35];
    }
    case 'bw': {
      const l = luma(r, g, b);
      return [l, l, l];
    }
    default:
      return [r, g, b];
  }
}

/** Contrast multiplier for a -100..100 setting, as used by common editors. */
const contrastFactor = (c: number) => {
  const k = (c / 100) * 255;
  return (259 * (k + 255)) / (255 * (259 - k));
};

/** Apply the look, then brightness, contrast and saturation, then fade and grain. Changes `p` in place. */
export function applyFilters(p: Pixels, o: FilterOptions): void {
  if (isIdentity(o)) return;
  const d = p.data;
  const w = p.width;
  const cf = contrastFactor(o.contrast);
  const bright = (o.brightness / 100) * 128;
  const sat = 1 + o.saturation / 100;
  const fade = o.fade / 100;
  const grain = (o.grain / 100) * 48;
  for (let i = 0; i < d.length; i += 4) {
    let [r, g, b] = look(o.look, d[i], d[i + 1], d[i + 2]);
    if (o.brightness) {
      r += bright;
      g += bright;
      b += bright;
    }
    if (o.contrast) {
      r = (r - 128) * cf + 128;
      g = (g - 128) * cf + 128;
      b = (b - 128) * cf + 128;
    }
    if (o.saturation) {
      const l = luma(r, g, b);
      r = l + (r - l) * sat;
      g = l + (g - l) * sat;
      b = l + (b - l) * sat;
    }
    if (fade) {
      // Blacks rise towards gray, whites fall a little, and color thins out.
      const l = luma(r, g, b);
      r = (r + (l - r) * 0.2 * fade) * (1 - 0.22 * fade) + 255 * 0.14 * fade;
      g = (g + (l - g) * 0.2 * fade) * (1 - 0.22 * fade) + 255 * 0.14 * fade;
      b = (b + (l - b) * 0.2 * fade) * (1 - 0.22 * fade) + 255 * 0.14 * fade;
    }
    if (grain) {
      const pixel = i / 4;
      const n = (noise(pixel % w, Math.floor(pixel / w)) - 0.5) * 2 * grain;
      r += n;
      g += n;
      b += n;
    }
    d[i] = clamp(r);
    d[i + 1] = clamp(g);
    d[i + 2] = clamp(b);
  }
}
