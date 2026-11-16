import { describe, expect, it } from 'vitest';
import {
  centeredRect,
  cropAround,
  clampRect,
  fitAspect,
  fromRelative,
  moveRect,
  resizeRect,
  setField,
  toPixels,
  toRelative,
  type Bounds,
  type Handle,
  type Rect,
} from './rect';

const B: Bounds = { w: 400, h: 300 };
const R: Rect = { x: 100, y: 80, w: 200, h: 100 };
const HANDLES: Handle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

const inside = (r: Rect, b: Bounds) =>
  r.x >= -1e-9 &&
  r.y >= -1e-9 &&
  r.x + r.w <= b.w + 1e-9 &&
  r.y + r.h <= b.h + 1e-9 &&
  r.w >= 1 - 1e-9 &&
  r.h >= 1 - 1e-9;

describe('moveRect', () => {
  it('moves and stops at the edges', () => {
    expect(moveRect(R, 10, -5, B)).toEqual({ x: 110, y: 75, w: 200, h: 100 });
    expect(moveRect(R, 1000, 1000, B)).toEqual({ x: 200, y: 200, w: 200, h: 100 });
    expect(moveRect(R, -1000, -1000, B)).toEqual({ x: 0, y: 0, w: 200, h: 100 });
  });
});

describe('resizeRect without an aspect', () => {
  it('moves only the sides of the handle', () => {
    expect(resizeRect(R, 'e', 20, 99, B)).toEqual({ x: 100, y: 80, w: 220, h: 100 });
    expect(resizeRect(R, 'nw', 10, 10, B)).toEqual({ x: 110, y: 90, w: 190, h: 90 });
    expect(resizeRect(R, 's', 0, 30, B)).toEqual({ x: 100, y: 80, w: 200, h: 130 });
  });

  it('never lets sides cross or leave the picture', () => {
    expect(resizeRect(R, 'e', -1000, 0, B).w).toBe(1);
    expect(resizeRect(R, 'w', 1000, 0, B)).toMatchObject({ x: 299, w: 1 });
    expect(resizeRect(R, 'se', 1000, 1000, B)).toEqual({ x: 100, y: 80, w: 300, h: 220 });
    expect(resizeRect(R, 'nw', -1000, -1000, B)).toEqual({ x: 0, y: 0, w: 300, h: 180 });
  });
});

describe('resizeRect with an aspect', () => {
  const aspect = 2; // R is 2:1
  it('keeps the shape and the opposite corner when dragging a corner', () => {
    const r = resizeRect(R, 'se', 40, 5, B, aspect);
    expect(r.w / r.h).toBeCloseTo(aspect);
    expect(r.x).toBe(100);
    expect(r.y).toBe(80);
    expect(r.w).toBeCloseTo(240);
  });

  it('grows from the other corners too', () => {
    const r = resizeRect(R, 'nw', -20, -20, B, aspect);
    expect(r.w / r.h).toBeCloseTo(aspect);
    expect(r.x + r.w).toBeCloseTo(300);
    expect(r.y + r.h).toBeCloseTo(180);
  });

  it('follows around the middle when dragging an edge', () => {
    const r = resizeRect(R, 'e', 40, 0, B, aspect);
    expect(r.w).toBeCloseTo(240);
    expect(r.h).toBeCloseTo(120);
    expect(r.y + r.h / 2).toBeCloseTo(130);
    const s = resizeRect(R, 's', 0, 20, B, aspect);
    expect(s.h).toBeCloseTo(120);
    expect(s.w).toBeCloseTo(240);
    expect(s.x + s.w / 2).toBeCloseTo(200);
  });

  it('stays inside the picture and keeps its shape however far it is dragged', () => {
    for (const aspectCase of [1, 0.5, 2, 16 / 9, 9 / 16]) {
      for (const handle of HANDLES) {
        for (const d of [-1000, -50, -3, 0, 3, 50, 1000]) {
          for (const e of [-1000, -50, 0, 50, 1000]) {
            const start = fitAspect(R, aspectCase, B);
            const r = resizeRect(start, handle, d, e, B, aspectCase);
            expect(inside(r, B), `${handle} ${d},${e} @${aspectCase}: ${JSON.stringify(r)}`).toBe(
              true,
            );
            expect(r.w / r.h).toBeCloseTo(aspectCase, 6);
          }
        }
      }
    }
  });
});

describe('fitAspect', () => {
  it('finds the largest box of that shape inside the current one', () => {
    expect(fitAspect(R, 1, B)).toEqual({ x: 150, y: 80, w: 100, h: 100 });
    const wide = fitAspect({ x: 0, y: 0, w: 100, h: 300 }, 1, B);
    expect(wide).toEqual({ x: 0, y: 100, w: 100, h: 100 });
  });
});

describe('setField', () => {
  it('moves and resizes from the number fields', () => {
    expect(setField(R, 'x', 50, B, null).x).toBe(50);
    expect(setField(R, 'x', 999, B, null).x).toBe(200);
    expect(setField(R, 'w', 150, B, null)).toMatchObject({ w: 150, h: 100 });
    expect(setField(R, 'h', 5000, B, null).h).toBe(220);
  });

  it('keeps the shape when an aspect is locked', () => {
    const r = setField(R, 'w', 100, B, 2);
    expect(r).toMatchObject({ w: 100, h: 50 });
    const t = setField(R, 'h', 60, B, 2);
    expect(t).toMatchObject({ w: 120, h: 60 });
  });

  it('ignores values that are not numbers', () => {
    expect(setField(R, 'w', NaN, B, null)).toBe(R);
  });
});

describe('relative regions', () => {
  it('carries a region to a picture of another size', () => {
    const rel = toRelative({ x: 100, y: 75, w: 200, h: 150 }, B);
    expect(fromRelative(rel, { w: 800, h: 600 })).toEqual({ x: 200, y: 150, w: 400, h: 300 });
    expect(fromRelative(rel, { w: 1000, h: 500 })).toEqual({ x: 250, y: 125, w: 500, h: 250 });
  });

  it('keeps an exact ratio on pictures of any shape', () => {
    const rel = toRelative({ x: 100, y: 75, w: 200, h: 150 }, B); // 4:3
    for (const target of [
      { w: 800, h: 600 },
      { w: 1000, h: 500 },
      { w: 300, h: 900 },
      { w: 64, h: 64 },
    ]) {
      const r = fromRelative(rel, target, 4 / 3);
      expect(r.w / r.h).toBeCloseTo(4 / 3, 6);
      expect(inside(r, target)).toBe(true);
    }
  });
});

describe('rounding for the crop', () => {
  it('gives whole pixels inside the picture', () => {
    expect(toPixels({ x: 10.4, y: 20.6, w: 99.5, h: 50.2 }, B)).toEqual({
      x: 10,
      y: 21,
      w: 100,
      h: 50,
    });
    expect(toPixels({ x: 399.9, y: 299.9, w: 5, h: 5 }, B)).toEqual({ x: 399, y: 299, w: 1, h: 1 });
  });

  it('clamps and centers', () => {
    expect(clampRect({ x: -5, y: 500, w: 9999, h: 20 }, B)).toEqual({
      x: 0,
      y: 280,
      w: 400,
      h: 20,
    });
    expect(centeredRect(B, 0.5)).toEqual({ x: 100, y: 75, w: 200, h: 150 });
    const square = centeredRect(B, 1, 1);
    expect(square).toEqual({ x: 50, y: 0, w: 300, h: 300 });
  });
});

describe('cropAround', () => {
  it('centers on the focal point when there is room', () => {
    // 400 x 300 picture, a wide 2:1 box is 400 x 200: it can only move up and down.
    expect(cropAround(B, 2, { x: 0.5, y: 0.5 })).toEqual({ x: 0, y: 50, w: 400, h: 200 });
    expect(cropAround(B, 2, { x: 0.5, y: 0.2 })).toEqual({ x: 0, y: 0, w: 400, h: 200 });
    expect(cropAround(B, 2, { x: 0.5, y: 0.9 })).toEqual({ x: 0, y: 100, w: 400, h: 200 });
  });

  it('slides sideways for tall boxes and stops at the edges', () => {
    const r = cropAround(B, 1, { x: 0.25, y: 0.5 }); // 300 x 300
    expect(r).toEqual({ x: 0, y: 0, w: 300, h: 300 });
    expect(cropAround(B, 1, { x: 0.5, y: 0.5 }).x).toBe(50);
    expect(cropAround(B, 1, { x: 1, y: 0.5 }).x).toBe(100);
  });

  it('always has the requested shape and stays inside', () => {
    for (const a of [0.3, 1, 1.5, 2.94, 5]) {
      for (const f of [0, 0.3, 1]) {
        const r = cropAround(B, a, { x: f, y: 1 - f });
        expect(r.w / r.h).toBeCloseTo(a, 6);
        expect(inside(r, B)).toBe(true);
      }
    }
  });
});
