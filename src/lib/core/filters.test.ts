import { describe, expect, it } from 'vitest';
import { applyFilters, isIdentity, noFilter, noise, type FilterOptions } from './filters';
import type { Pixels } from './pixels';

const px = (rgb: number[], n = 1): Pixels => ({
  data: new Uint8ClampedArray(Array.from({ length: n }, () => [...rgb, 255]).flat()),
  width: n,
  height: 1,
});
const run = (rgb: number[], o: Partial<FilterOptions>) => {
  const p = px(rgb);
  applyFilters(p, { ...noFilter, ...o });
  return [...p.data.subarray(0, 3)];
};
const luma = ([r, g, b]: number[]) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

describe('applyFilters', () => {
  it('does nothing when every setting is neutral', () => {
    expect(isIdentity(noFilter)).toBe(true);
    const p = px([12, 200, 99], 4);
    const copy = Uint8ClampedArray.from(p.data);
    applyFilters(p, noFilter);
    expect(p.data).toEqual(copy);
  });

  it('black and white makes every channel equal and keeps brightness', () => {
    const [r, g, b] = run([200, 80, 20], { look: 'bw' });
    expect(r).toBe(g);
    expect(g).toBe(b);
    expect(Math.abs(r - luma([200, 80, 20]))).toBeLessThan(1.5);
  });

  it('warm adds red and removes blue; cool does the opposite', () => {
    const base = [120, 120, 120];
    const warm = run(base, { look: 'warm' });
    const cool = run(base, { look: 'cool' });
    expect(warm[0]).toBeGreaterThan(warm[2]);
    expect(cool[2]).toBeGreaterThan(cool[0]);
  });

  it('vivid raises saturation and moody lowers it, in size of the color spread', () => {
    const spread = ([r, g, b]: number[]) => Math.max(r, g, b) - Math.min(r, g, b);
    const base = [180, 100, 60];
    expect(spread(run(base, { look: 'vivid' }))).toBeGreaterThan(spread(base));
    expect(spread(run(base, { look: 'moody' }))).toBeLessThan(spread(base));
  });

  it('vintage tints towards warm tones', () => {
    const v = run([128, 128, 128], { look: 'vintage' });
    expect(v[0]).toBeGreaterThan(v[2]);
  });

  it('brightness moves everything the same way, and is clamped', () => {
    expect(run([100, 100, 100], { brightness: 50 })[0]).toBeGreaterThan(100);
    expect(run([100, 100, 100], { brightness: -50 })[0]).toBeLessThan(100);
    expect(run([250, 250, 250], { brightness: 100 })).toEqual([255, 255, 255]);
    expect(run([5, 5, 5], { brightness: -100 })).toEqual([0, 0, 0]);
  });

  it('contrast spreads values around the middle', () => {
    expect(run([200, 200, 200], { contrast: 60 })[0]).toBeGreaterThan(200);
    expect(run([60, 60, 60], { contrast: 60 })[0]).toBeLessThan(60);
    expect(run([128, 128, 128], { contrast: 60 })[0]).toBeCloseTo(128, 0);
    expect(run([200, 200, 200], { contrast: -60 })[0]).toBeLessThan(200);
  });

  it('saturation -100 gives gray, and +100 spreads the colors', () => {
    const [r, g, b] = run([200, 100, 50], { saturation: -100 });
    expect(Math.abs(r - g)).toBeLessThanOrEqual(1);
    expect(Math.abs(g - b)).toBeLessThanOrEqual(1);
    const more = run([200, 100, 50], { saturation: 100 });
    expect(more[0] - more[2]).toBeGreaterThan(150);
  });

  it('fade lifts the blacks and lowers the whites', () => {
    expect(run([0, 0, 0], { fade: 100 })[0]).toBeGreaterThan(25);
    expect(run([255, 255, 255], { fade: 100 })[0]).toBeLessThan(255);
    expect(run([0, 0, 0], { fade: 50 })[0]).toBeLessThan(run([0, 0, 0], { fade: 100 })[0]);
  });

  it('grain changes pixels a little, the same way every time, and not the color balance', () => {
    const make = () => px([128, 128, 128], 400);
    const a = make();
    const b = make();
    applyFilters(a, { ...noFilter, grain: 50 });
    applyFilters(b, { ...noFilter, grain: 50 });
    expect(a.data).toEqual(b.data);
    const values = Array.from({ length: 400 }, (_, i) => a.data[i * 4]);
    expect(new Set(values).size).toBeGreaterThan(20);
    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    expect(Math.abs(mean - 128)).toBeLessThan(4);
    expect(Math.max(...values) - Math.min(...values)).toBeLessThan(60);
    for (let i = 0; i < 400; i++) expect(a.data[i * 4]).toBe(a.data[i * 4 + 1]); // gray stays gray
  });

  it('keeps transparency untouched', () => {
    const p: Pixels = { data: new Uint8ClampedArray([50, 60, 70, 40]), width: 1, height: 1 };
    applyFilters(p, { ...noFilter, look: 'bw', fade: 50 });
    expect(p.data[3]).toBe(40);
  });
});

describe('noise', () => {
  it('is between 0 and 1 and depends on the position', () => {
    for (let i = 0; i < 200; i++) {
      const n = noise(i, i * 3);
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(1);
    }
    expect(noise(1, 2)).not.toBe(noise(2, 1));
    expect(noise(5, 5)).toBe(noise(5, 5));
  });
});
