import { describe, expect, it } from 'vitest';
import { drawSingle, drawTiled, markSize, place, tileCenters, type Surface } from './watermark';

const mark = { width: 400, height: 100 };

describe('markSize', () => {
  it('is the same share of the width at any resolution', () => {
    for (const W of [640, 2048, 8000]) {
      const { w, h } = markSize(W, mark, 6);
      expect(w / W).toBeCloseTo(0.06);
      expect(h / w).toBeCloseTo(0.25);
    }
  });
});

describe('place', () => {
  const W = 1000;
  const H = 500;
  const w = 100;
  const h = 40;
  it('puts the mark in each of the nine places, with the margin from the edges', () => {
    const m = 4; // 40 px of 1000
    expect(place(W, H, w, h, 'tl', m)).toEqual({ x: 40, y: 40 });
    expect(place(W, H, w, h, 't', m)).toEqual({ x: 450, y: 40 });
    expect(place(W, H, w, h, 'tr', m)).toEqual({ x: 860, y: 40 });
    expect(place(W, H, w, h, 'l', m)).toEqual({ x: 40, y: 230 });
    expect(place(W, H, w, h, 'c', m)).toEqual({ x: 450, y: 230 });
    expect(place(W, H, w, h, 'r', m)).toEqual({ x: 860, y: 230 });
    expect(place(W, H, w, h, 'bl', m)).toEqual({ x: 40, y: 420 });
    expect(place(W, H, w, h, 'b', m)).toEqual({ x: 450, y: 420 });
    expect(place(W, H, w, h, 'br', m)).toEqual({ x: 860, y: 420 });
  });

  it('keeps the same share of the picture at other resolutions', () => {
    const a = place(1000, 500, 100, 40, 'br', 4);
    const b = place(4000, 2000, 400, 160, 'br', 4);
    expect(b.x / 4000).toBeCloseTo(a.x / 1000);
    expect(b.y / 4000).toBeCloseTo(a.y / 1000);
  });
});

describe('tileCenters', () => {
  it('covers the whole picture, whatever the angle', () => {
    const W = 800;
    const H = 600;
    const centers = tileCenters(W, H, 120, 30, 15);
    const reach = Math.hypot(W, H) / 2;
    expect(Math.max(...centers.map((c) => Math.abs(c.x)))).toBeGreaterThanOrEqual(reach);
    expect(Math.max(...centers.map((c) => Math.abs(c.y)))).toBeGreaterThanOrEqual(reach);
  });

  it('staggers every other row by half a step', () => {
    const centers = tileCenters(400, 300, 100, 20, 0);
    const row0 = centers.filter((c) => c.y === 0).map((c) => c.x);
    const row1 = centers.filter((c) => c.y === 20).map((c) => c.x);
    expect(row0).toContain(0);
    expect(row1).toContain(50);
    expect(row1).not.toContain(0);
  });

  it('spaces marks by their size plus the gap', () => {
    const centers = tileCenters(400, 300, 100, 20, 50);
    const xs = centers
      .filter((c) => c.y === 0)
      .map((c) => c.x)
      .sort((a, b) => a - b);
    expect(xs[1] - xs[0]).toBe(150);
  });
});

function recorder() {
  const calls: string[] = [];
  const ctx: Surface = {
    globalAlpha: 1,
    save: () => calls.push('save'),
    restore: () => calls.push('restore'),
    translate: (x, y) => calls.push(`translate ${x} ${y}`),
    rotate: (a) => calls.push(`rotate ${a.toFixed(3)}`),
    drawImage: (_i, x, y, w, h) =>
      calls.push(
        `draw ${Math.round(x)} ${Math.round(y)} ${Math.round(w)} ${Math.round(h)} a${ctx.globalAlpha}`,
      ),
  };
  return { ctx, calls };
}

describe('drawing', () => {
  it('draws one mark with its opacity, then restores the surface', () => {
    const { ctx, calls } = recorder();
    drawSingle(ctx, 1000, 500, mark, { size: 10, position: 'br', margin: 5, opacity: 70 });
    expect(calls).toEqual(['save', 'draw 850 425 100 25 a0.7', 'restore']);
  });

  it('draws a rotated grid of marks', () => {
    const { ctx, calls } = recorder();
    drawTiled(ctx, 400, 300, mark, { size: 25, angle: -30, gap: 15, opacity: 30 });
    expect(calls[1]).toBe('translate 200 150');
    expect(calls[2]).toBe('rotate -0.524');
    expect(calls.filter((c) => c.startsWith('draw')).length).toBeGreaterThan(20);
    expect(calls.at(-1)).toBe('restore');
  });
});
