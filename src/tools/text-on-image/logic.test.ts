import { describe, expect, it } from 'vitest';
import { clamp01, hitTest, layerBox, newLayer, reorder } from './logic';

const measure = (t: string, px: number) => t.length * px * 0.5;

describe('layerBox', () => {
  it('is centered on the layer position and grows with size, lines and the box', () => {
    const l = { ...newLayer(1, 0), text: 'abcd', size: 10, x: 0.5, y: 0.5 };
    const b = layerBox(l, 1000, 500, measure);
    // 100 px letters 50 wide: 4 letters = 200 wide, 120 high, plus 5 percent padding.
    expect(b.w).toBeCloseTo(200 + 10);
    expect(b.h).toBeCloseTo(120 + 10);
    expect(b.x + b.w / 2).toBeCloseTo(500);
    expect(b.y + b.h / 2).toBeCloseTo(250);
    const two = layerBox({ ...l, text: 'abcd\nab' }, 1000, 500, measure);
    expect(two.h).toBeGreaterThan(b.h * 1.8);
    expect(two.w).toBeCloseTo(b.w);
    const boxed = layerBox({ ...l, box: true }, 1000, 500, measure);
    expect(boxed.w).toBeGreaterThan(b.w);
  });

  it('keeps the same share of the picture at any resolution', () => {
    const l = { ...newLayer(1, 0), text: 'abcd', size: 10, x: 0.25, y: 0.75 };
    const a = layerBox(l, 500, 300, measure);
    const b = layerBox(l, 2000, 1200, measure);
    expect(b.w / 2000).toBeCloseTo(a.w / 500);
    expect(b.x / 2000).toBeCloseTo(a.x / 500);
    expect(b.y / 1200).toBeCloseTo(a.y / 300);
  });

  it('has a usable size for empty text', () => {
    expect(layerBox({ ...newLayer(1, 0), text: '' }, 1000, 500, measure).w).toBeGreaterThan(0);
  });
});

describe('hitTest', () => {
  const boxes = [
    { x: 0, y: 0, w: 100, h: 100 },
    { x: 50, y: 50, w: 100, h: 100 },
  ];
  it('picks the topmost layer, and nothing outside', () => {
    expect(hitTest(boxes, 10, 10)).toBe(0);
    expect(hitTest(boxes, 75, 75)).toBe(1);
    expect(hitTest(boxes, 140, 140)).toBe(1);
    expect(hitTest(boxes, 200, 200)).toBeNull();
  });
});

describe('layers', () => {
  it('reorders without going past the ends', () => {
    expect(reorder([1, 2, 3], 0, 1)).toEqual([2, 1, 3]);
    expect(reorder([1, 2, 3], 2, -1)).toEqual([1, 3, 2]);
    const same = [1, 2, 3];
    expect(reorder(same, 0, -1)).toBe(same);
    expect(reorder(same, 2, 1)).toBe(same);
  });

  it('starts new layers at different heights', () => {
    expect(newLayer(2, 1).y).toBeGreaterThan(newLayer(1, 0).y);
    expect(newLayer(9, 99).y).toBeLessThanOrEqual(0.85);
  });

  it('clamps to the picture', () => {
    expect([clamp01(-1), clamp01(0.4), clamp01(3)]).toEqual([0, 0.4, 1]);
  });
});
