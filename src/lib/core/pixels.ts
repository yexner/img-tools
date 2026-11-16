// Our own pixel operations, so a preview and a saved file look the same in every browser (no canvas filters).
// They work on plain RGBA arrays and have no DOM dependency, which keeps them testable in Node.

export interface Pixels {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

/** One blurred line: a running average over `2 * radius + 1` samples, with the edge pixel repeated. */
function blurLine(src: Float32Array, dst: Float32Array, n: number, stride: number, radius: number) {
  const size = 2 * radius + 1;
  for (let c = 0; c < 4; c++) {
    let sum = src[c] * radius; // the first pixel stands in for everything left of the line
    for (let i = 0; i < radius; i++) sum += src[Math.min(i, n - 1) * stride + c];
    for (let i = 0; i < n; i++) {
      sum += src[Math.min(i + radius, n - 1) * stride + c];
      dst[i * stride + c] = sum / size;
      sum -= src[Math.max(i - radius, 0) * stride + c];
    }
  }
}

/** Blur in place. Three passes of a box blur look like a smooth (Gaussian) blur. */
export function boxBlur(p: Pixels, radius: number, passes = 3): void {
  const r = Math.max(0, Math.round(radius));
  if (r === 0) return;
  const { width: w, height: h } = p;
  let a = Float32Array.from(p.data);
  let b = new Float32Array(a.length);
  for (let pass = 0; pass < passes; pass++) {
    for (let y = 0; y < h; y++) blurLine(a.subarray(y * w * 4), b.subarray(y * w * 4), w, 4, r);
    [a, b] = [b, a];
    for (let x = 0; x < w; x++) blurLine(a.subarray(x * 4), b.subarray(x * 4), h, w * 4, r);
    [a, b] = [b, a];
  }
  for (let i = 0; i < a.length; i++) p.data[i] = a[i];
}

/** Replace every `block` x `block` square (the last ones may be smaller) by its average color. */
export function pixelate(p: Pixels, block: number): void {
  const s = Math.max(1, Math.round(block));
  const { width: w, height: h, data } = p;
  for (let by = 0; by < h; by += s) {
    for (let bx = 0; bx < w; bx += s) {
      const x1 = Math.min(bx + s, w);
      const y1 = Math.min(by + s, h);
      const sum = [0, 0, 0, 0];
      for (let y = by; y < y1; y++) {
        for (let x = bx; x < x1; x++)
          for (let c = 0; c < 4; c++) sum[c] += data[(y * w + x) * 4 + c];
      }
      const n = (x1 - bx) * (y1 - by);
      for (let y = by; y < y1; y++) {
        for (let x = bx; x < x1; x++)
          for (let c = 0; c < 4; c++) data[(y * w + x) * 4 + c] = sum[c] / n;
      }
    }
  }
}

/** Paint every pixel with one fully opaque color. Nothing of the old pixels is kept. */
export function fillSolid(p: Pixels, rgb: [number, number, number]): void {
  for (let i = 0; i < p.data.length; i += 4) {
    p.data[i] = rgb[0];
    p.data[i + 1] = rgb[1];
    p.data[i + 2] = rgb[2];
    p.data[i + 3] = 255;
  }
}

/** `#rrggbb` as numbers; anything else gives black. */
export function parseHex(hex: string): [number, number, number] {
  const m = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return [0, 0, 0];
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export type RegionStyle = 'blur' | 'pixelate' | 'fill';
export type RegionShape = 'rect' | 'oval';

/**
 * How much of the pixel (x, y) lies inside the ellipse inscribed in a `w` x `h` box: 0 outside, 1 inside,
 * and a one pixel wide ramp on the edge so the shape is smooth.
 */
export function ellipseCoverage(x: number, y: number, w: number, h: number): number {
  const rx = w / 2;
  const ry = h / 2;
  const d = Math.hypot((x + 0.5 - rx) / rx, (y + 0.5 - ry) / ry);
  // The distance to the edge in pixels, close enough for the ramp (exact on the shorter axis).
  return Math.min(1, Math.max(0, (1 - d) * Math.min(rx, ry) + 0.5));
}

/** Keep the changed `pixels` only inside the inscribed ellipse; outside it, put back the `original` data. */
export function restoreOutsideEllipse(p: Pixels, original: Uint8ClampedArray): void {
  const { data, width, height } = p;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const c = ellipseCoverage(x, y, width, height);
      if (c >= 1) continue;
      const i = (y * width + x) * 4;
      for (let k = 0; k < 4; k++)
        data[i + k] = original[i + k] + (data[i + k] - original[i + k]) * c;
    }
  }
}

/** How strong an effect is for a region: 1 to 100 maps onto a share of the region's shorter side. */
export function effectSize(strength: number, width: number, height: number): number {
  const s = Math.min(100, Math.max(1, strength));
  return Math.max(2, Math.round((s / 100) * Math.min(width, height) * 0.25));
}
