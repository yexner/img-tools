import { describe, expect, it } from 'vitest';
import { className, pack, toCss, type Box } from './logic';

const overlap = (
  a: { x: number; y: number } & Box,
  b: { x: number; y: number } & Box,
  gap: number,
) =>
  a.x < b.x + b.width + gap &&
  b.x < a.x + a.width + gap &&
  a.y < b.y + b.height + gap &&
  b.y < a.y + a.height + gap;

describe('pack', () => {
  const sets: Box[][] = [
    [{ width: 16, height: 16 }],
    Array.from({ length: 20 }, () => ({ width: 24, height: 24 })),
    [
      { width: 100, height: 20 },
      { width: 30, height: 80 },
      { width: 64, height: 64 },
      { width: 10, height: 10 },
      { width: 48, height: 32 },
      { width: 200, height: 12 },
    ],
    Array.from({ length: 40 }, (_, i) => ({
      width: 8 + ((i * 37) % 60),
      height: 8 + ((i * 53) % 70),
    })),
  ];

  it('never overlaps, keeps the gap and stays inside the sheet', () => {
    for (const gap of [0, 2, 10]) {
      for (const boxes of sets) {
        const r = pack(boxes, gap);
        const placed = boxes.map((b, i) => ({ ...b, ...r.places[i] }));
        for (const p of placed) {
          expect(p.x).toBeGreaterThanOrEqual(0);
          expect(p.y).toBeGreaterThanOrEqual(0);
          expect(p.x + p.width).toBeLessThanOrEqual(r.width);
          expect(p.y + p.height).toBeLessThanOrEqual(r.height);
        }
        for (let i = 0; i < placed.length; i++) {
          for (let j = i + 1; j < placed.length; j++) {
            expect(overlap(placed[i], placed[j], gap), `${i} and ${j} at gap ${gap}`).toBe(false);
          }
        }
      }
    }
  });

  it('is deterministic and makes a sheet that is not absurdly tall or wide', () => {
    const boxes = sets[1];
    expect(pack(boxes, 2)).toEqual(pack(boxes, 2));
    const r = pack(boxes, 2);
    expect(Math.max(r.width, r.height) / Math.min(r.width, r.height)).toBeLessThan(2);
  });

  it('handles nothing', () => {
    expect(pack([], 2)).toEqual({ width: 0, height: 0, places: [] });
  });
});

describe('className', () => {
  it('makes safe, unique class names from file names', () => {
    const taken = new Set<string>();
    expect(className('Home Icon.PNG', taken)).toBe('icon-home-icon');
    expect(className('home-icon.svg', taken)).toBe('icon-home-icon-2');
    expect(className('home icon.webp', taken)).toBe('icon-home-icon-3');
    expect(className('ünï €.png', taken)).toBe('icon-n');
    expect(className('###.png', taken)).toBe('icon-image');
  });
});

describe('toCss', () => {
  const sprites = [
    { name: 'icon-a', x: 0, y: 0, width: 16, height: 16 },
    { name: 'icon-b', x: 18, y: 4, width: 24, height: 12 },
  ];

  it('has the shared class and one class per picture, with negative offsets', () => {
    const css = toCss(sprites, { width: 42, height: 16 }, false);
    expect(css).toContain('.icon {\n  display: inline-block;');
    expect(css).toContain(
      '.icon-a {\n  width: 16px;\n  height: 16px;\n  background-position: 0 0;\n}',
    );
    expect(css).toContain('background-position: -18px -4px;');
    expect(css).not.toContain('min-resolution');
  });

  it('adds the retina rule with the sheet size at 1x', () => {
    const css = toCss(sprites, { width: 42, height: 16 }, true);
    expect(css).toContain('sprite@2x.png');
    expect(css).toContain('background-size: 42px 16px;');
  });
});
