import { describe, expect, it } from 'vitest';
import {
  boxBlur,
  effectSize,
  ellipseCoverage,
  fillSolid,
  parseHex,
  pixelate,
  restoreOutsideEllipse,
  type Pixels,
} from './pixels';

const make = (w: number, h: number, f: (x: number, y: number) => number[]): Pixels => {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) data.set(f(x, y), (y * w + x) * 4);
  return { data, width: w, height: h };
};
const at = (p: Pixels, x: number, y: number) => [
  ...p.data.subarray((y * p.width + x) * 4, (y * p.width + x) * 4 + 4),
];

describe('boxBlur', () => {
  it('leaves a flat picture as it is', () => {
    const p = make(20, 15, () => [10, 200, 30, 255]);
    boxBlur(p, 4);
    expect(at(p, 0, 0)).toEqual([10, 200, 30, 255]);
    expect(at(p, 19, 14)).toEqual([10, 200, 30, 255]);
  });

  it('spreads a bright pixel over its neighbors and keeps the total light', () => {
    const p = make(31, 31, (x, y) =>
      x === 15 && y === 15 ? [255, 255, 255, 255] : [0, 0, 0, 255],
    );
    const before = p.data.reduce((s, v, i) => (i % 4 === 0 ? s + v : s), 0);
    boxBlur(p, 3);
    const after = p.data.reduce((s, v, i) => (i % 4 === 0 ? s + v : s), 0);
    expect(at(p, 15, 15)[0]).toBeLessThan(10);
    expect(at(p, 17, 15)[0]).toBeGreaterThan(0);
    expect(Math.abs(after - before) / before).toBeLessThan(0.15); // rounding to whole numbers loses a little
  });

  it('is deterministic and does nothing at radius 0', () => {
    const a = make(10, 10, (x, y) => [x * 20, y * 20, 7, 255]);
    const b = make(10, 10, (x, y) => [x * 20, y * 20, 7, 255]);
    boxBlur(a, 2);
    boxBlur(b, 2);
    expect(a.data).toEqual(b.data);
    const c = make(4, 4, (x) => [x * 50, 0, 0, 255]);
    const copy = Uint8ClampedArray.from(c.data);
    boxBlur(c, 0);
    expect(c.data).toEqual(copy);
  });

  it('turns hard edges into gradients', () => {
    const p = make(40, 4, (x) => (x < 20 ? [0, 0, 0, 255] : [255, 255, 255, 255]));
    boxBlur(p, 5);
    const row = Array.from({ length: 40 }, (_, x) => at(p, x, 1)[0]);
    expect(row[0]).toBe(0);
    expect(row[39]).toBe(255);
    for (let x = 1; x < 40; x++) expect(row[x]).toBeGreaterThanOrEqual(row[x - 1]);
    expect(row.filter((v) => v > 0 && v < 255).length).toBeGreaterThan(5);
  });
});

describe('pixelate', () => {
  it('makes every block one color, the average of what was there', () => {
    const p = make(8, 8, (x, y) => [(x + y) * 10, 0, 0, 255]);
    const copy = make(8, 8, (x, y) => [(x + y) * 10, 0, 0, 255]);
    pixelate(p, 4);
    for (const [bx, by] of [
      [0, 0],
      [4, 0],
      [0, 4],
      [4, 4],
    ]) {
      let sum = 0;
      for (let y = by; y < by + 4; y++) for (let x = bx; x < bx + 4; x++) sum += at(copy, x, y)[0];
      for (let y = by; y < by + 4; y++)
        for (let x = bx; x < bx + 4; x++) expect(at(p, x, y)[0]).toBe(Math.round(sum / 16));
    }
  });

  it('handles edges that do not fit a whole block', () => {
    const p = make(7, 5, (x) => [x * 30, 0, 0, 255]);
    pixelate(p, 4);
    expect(at(p, 4, 0)).toEqual(at(p, 6, 4));
    expect(at(p, 0, 0)).toEqual(at(p, 3, 3));
  });
});

describe('fillSolid', () => {
  it('replaces every pixel exactly, including transparent ones', () => {
    const p = make(5, 5, (x, y) => [x * 50, y * 50, 123, x === 2 ? 0 : 200]);
    fillSolid(p, [12, 34, 56]);
    for (let i = 0; i < p.data.length; i += 4) {
      expect([...p.data.subarray(i, i + 4)]).toEqual([12, 34, 56, 255]);
    }
  });
});

describe('helpers', () => {
  it('parses hex colors', () => {
    expect(parseHex('#ff8000')).toEqual([255, 128, 0]);
    expect(parseHex('nonsense')).toEqual([0, 0, 0]);
  });

  it('scales the effect with the region and the strength', () => {
    expect(effectSize(100, 200, 100)).toBe(25);
    expect(effectSize(50, 200, 100)).toBe(13);
    expect(effectSize(1, 10, 10)).toBe(2);
    expect(effectSize(500, 100, 100)).toBe(25);
  });
});

describe('ellipse mask', () => {
  it('covers the middle and not the corners of the box', () => {
    expect(ellipseCoverage(10, 10, 21, 21)).toBe(1);
    for (const [x, y] of [
      [0, 0],
      [20, 0],
      [0, 20],
      [20, 20],
    ])
      expect(ellipseCoverage(x, y, 21, 21)).toBe(0);
  });

  it('follows the ellipse equation for a wide box', () => {
    // Inside along the long axis, outside along the same distance on the short axis.
    expect(ellipseCoverage(90, 25, 100, 50)).toBe(1);
    expect(ellipseCoverage(50, 2, 100, 50)).toBe(1);
    expect(ellipseCoverage(5, 5, 100, 50)).toBe(0);
    expect(ellipseCoverage(94, 44, 100, 50)).toBe(0);
  });

  it('ramps smoothly on the edge', () => {
    const c = ellipseCoverage(0, 6, 21, 21);
    expect(c).toBeGreaterThan(0);
    expect(c).toBeLessThan(1);
  });

  it('puts the original back outside the ellipse only', () => {
    const original = make(20, 20, () => [10, 20, 30, 255]).data.slice();
    const changed = make(20, 20, () => [200, 100, 50, 255]);
    restoreOutsideEllipse(changed, original);
    expect(at(changed, 0, 0)).toEqual([10, 20, 30, 255]);
    expect(at(changed, 19, 19)).toEqual([10, 20, 30, 255]);
    expect(at(changed, 10, 10)).toEqual([200, 100, 50, 255]);
  });
});
