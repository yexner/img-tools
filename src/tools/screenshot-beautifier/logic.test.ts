import { describe, expect, it } from 'vitest';
import { layoutFor, RATIOS, type Options } from './logic';

const base: Options = {
  padding: 80,
  radius: 16,
  titleBar: true,
  shadow: true,
  shadowStrength: 50,
  shape: 'auto',
};

describe('layoutFor', () => {
  it('adds the padding on every side, and the title bar on top', () => {
    const l = layoutFor(1000, 600, base);
    expect(l.unit).toBe(1);
    expect(l.barHeight).toBe(46);
    expect(l.width).toBe(1000 + 160);
    expect(l.height).toBe(600 + 46 + 160);
    expect(l.win).toEqual({ x: 80, y: 80, w: 1000, h: 646 });
  });

  it('scales padding and the bar with the size of the screenshot', () => {
    const small = layoutFor(500, 300, base);
    const big = layoutFor(2000, 1200, base);
    expect(small.win.x).toBe(40);
    expect(big.win.x).toBe(160);
    expect(big.barHeight).toBe(92);
  });

  it('has no bar when switched off', () => {
    const l = layoutFor(1000, 600, { ...base, titleBar: false });
    expect(l.barHeight).toBe(0);
    expect(l.win.h).toBe(600);
  });

  it('gives each fixed shape exactly, with the window centered and unchanged in size', () => {
    for (const shape of ['16:9', '1:1', '4:5'] as const) {
      for (const [w, h] of [
        [1000, 600],
        [600, 1000],
        [1600, 400],
        [300, 300],
      ]) {
        const l = layoutFor(w, h, { ...base, shape });
        expect(Math.abs(l.width / l.height - RATIOS[shape])).toBeLessThan(0.01);
        expect(l.win.w).toBe(w);
        expect(l.win.h).toBe(h + l.barHeight);
        expect(l.win.x * 2 + l.win.w).toBeGreaterThanOrEqual(l.width - 1);
        expect(l.win.x * 2 + l.win.w).toBeLessThanOrEqual(l.width + 1);
        expect(l.win.y * 2 + l.win.h).toBeGreaterThanOrEqual(l.height - 1);
        expect(l.win.y * 2 + l.win.h).toBeLessThanOrEqual(l.height + 1);
        expect(l.width).toBeGreaterThanOrEqual(w);
        expect(l.height).toBeGreaterThanOrEqual(h);
      }
    }
  });
});
