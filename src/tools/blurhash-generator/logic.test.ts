import { readFileSync } from 'node:fs';
import { decode, encode, isBlurhashValid } from 'blurhash';
import { describe, expect, it } from 'vitest';
import { components, cssGradient, onWhite } from './logic';

const solid = (w: number, h: number, rgba: number[]) => {
  const a = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < a.length; i += 4) a.set(rgba, i);
  return a;
};

describe('blurhash logic', () => {
  it('puts transparent pixels on white', () => {
    const out = onWhite(new Uint8ClampedArray([0, 0, 0, 0, 100, 0, 0, 255, 0, 0, 0, 128]));
    expect([...out.subarray(0, 4)]).toEqual([255, 255, 255, 255]);
    expect([...out.subarray(4, 8)]).toEqual([100, 0, 0, 255]);
    expect(out[8]).toBe(127); // half transparent black is mid gray
  });

  it('reads the detail steps back from a hash', () => {
    const px = solid(16, 16, [200, 40, 40, 255]);
    for (const [x, y] of [
      [4, 3],
      [1, 1],
      [9, 9],
      [2, 7],
    ]) {
      const hash = encode(px, 16, 16, x, y);
      expect(components(hash)).toEqual({ x, y });
      expect(hash.length).toBe(4 + 2 * x * y);
      expect(isBlurhashValid(hash).result).toBe(true);
    }
  });

  it("gives one gradient layer per row, with the picture's colors", () => {
    const hash = encode(solid(16, 16, [255, 0, 0, 255]), 16, 16, 4, 3);
    const css = cssGradient(hash, 16, 16);
    expect(css.match(/linear-gradient/g)).toHaveLength(6);
    expect(css).toMatch(/#ff0000|#fe0000|#ff0101/);
    expect(css.startsWith('background: ')).toBe(true);
    expect(css.endsWith(';')).toBe(true);
  });

  it('round-trips a real picture closely enough to recognize it', () => {
    // The left half red, the right half blue.
    const w = 32;
    const h = 16;
    const px = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++)
        px.set(x < 16 ? [255, 0, 0, 255] : [0, 0, 255, 255], (y * w + x) * 4);
    const out = decode(encode(px, w, h, 4, 3), w, h);
    expect(out[(8 * w + 2) * 4]).toBeGreaterThan(180); // red on the left
    expect(out[(8 * w + 29) * 4 + 2]).toBeGreaterThan(180); // blue on the right
    void readFileSync;
  });
});
