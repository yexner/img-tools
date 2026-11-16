import { describe, expect, it } from 'vitest';
import { extractPalette, toCssVariables, toHex, toHsl, toJson, toTailwind } from './logic';

/** `parts` is a list of [color, number of pixels]. */
function picture(parts: [number[], number][]) {
  const total = parts.reduce((n, [, c]) => n + c, 0);
  const a = new Uint8ClampedArray(total * 4);
  let at = 0;
  for (const [rgba, count] of parts) for (let i = 0; i < count; i++) a.set(rgba, at++ * 4);
  return a;
}

describe('color maths', () => {
  it('writes hex', () => {
    expect(toHex([255, 128, 0])).toBe('#ff8000');
    expect(toHex([0, 0, 0])).toBe('#000000');
  });

  it('converts to HSL', () => {
    expect(toHsl([255, 0, 0])).toEqual([0, 100, 50]);
    expect(toHsl([0, 255, 0])).toEqual([120, 100, 50]);
    expect(toHsl([0, 0, 255])).toEqual([240, 100, 50]);
    expect(toHsl([255, 255, 255])).toEqual([0, 0, 100]);
    expect(toHsl([128, 128, 128])).toEqual([0, 0, 50]);
    expect(toHsl([255, 255, 0])).toEqual([60, 100, 50]);
  });
});

describe('extractPalette', () => {
  it('finds the colors and their shares, most common first', () => {
    const swatches = extractPalette(
      picture([
        [[255, 0, 0, 255], 600],
        [[0, 0, 255, 255], 300],
        [[0, 255, 0, 255], 100],
      ]),
      4,
    );
    expect(swatches.map((s) => s.hex)).toEqual(['#ff0000', '#0000ff', '#00ff00']);
    expect(swatches.map((s) => Math.round(s.share))).toEqual([60, 30, 10]);
    expect(swatches.reduce((n, s) => n + s.share, 0)).toBeCloseTo(100);
  });

  it('ignores transparent areas', () => {
    const swatches = extractPalette(
      picture([
        [[10, 10, 10, 0], 900], // clear background
        [[200, 30, 30, 255], 100],
      ]),
      4,
    );
    expect(swatches).toHaveLength(1);
    expect(swatches[0].share).toBeCloseTo(100);
    expect(swatches[0].rgb[0]).toBeGreaterThan(190);
  });

  it('gives nothing for a fully transparent picture', () => {
    expect(extractPalette(picture([[[0, 0, 0, 0], 50]]), 6)).toEqual([]);
  });

  it('never returns more colors than asked', () => {
    const many = new Uint8ClampedArray(2000 * 4);
    for (let i = 0; i < 2000; i++)
      many.set([(i * 37) % 256, (i * 91) % 256, (i * 13) % 256, 255], i * 4);
    for (const n of [4, 6, 8, 10]) expect(extractPalette(many, n).length).toBeLessThanOrEqual(n);
  });
});

describe('exports', () => {
  const s = extractPalette(
    picture([
      [[255, 0, 0, 255], 3],
      [[0, 0, 255, 255], 1],
    ]),
    4,
  );

  it('writes CSS variables', () => {
    expect(toCssVariables(s)).toBe(':root {\n  --color-1: #ff0000;\n  --color-2: #0000ff;\n}\n');
  });

  it('writes JSON with every format', () => {
    const json = JSON.parse(toJson(s));
    expect(json[0]).toEqual({ hex: '#ff0000', rgb: [255, 0, 0], hsl: [0, 100, 50], share: 75 });
  });

  it('writes a Tailwind theme', () => {
    expect(toTailwind(s)).toContain("1: '#ff0000',");
    expect(toTailwind(s)).toContain('colors: {');
  });
});
