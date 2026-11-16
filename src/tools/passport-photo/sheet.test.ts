import { describe, expect, it } from 'vitest';
import { cells, fitCount, gapCost, layout, mmToPx, SHEETS, valid } from './sheet';

const sheet = (id: string) => SHEETS.find((s) => s.id === id)!;
const PHOTOS = {
  '35x45': { width: 35, height: 45 },
  '2x2': { width: 2 * 25.4, height: 2 * 25.4 },
};
const photo = (id: keyof typeof PHOTOS) => PHOTOS[id];

describe('fitCount', () => {
  it('counts photos with a gap between them only', () => {
    expect(fitCount(100, 30, 5)).toBe(3); // 30+5+30+5+30 = 100
    expect(fitCount(99.9, 30, 5)).toBe(2);
    expect(fitCount(20, 30, 0)).toBe(0);
  });

  it('keeps a photo that fits exactly', () => {
    expect(fitCount(204, 51, 0)).toBe(4);
  });
});

describe('layout', () => {
  it('fits 35 × 45 mm photos on a 4 × 6 in sheet, turned to the landscape', () => {
    const g = layout(sheet('4x6'), photo('35x45'), 0);
    expect(g.turned).toBe(true);
    expect([g.columns, g.rows, g.count]).toEqual([4, 2, 8]);
  });

  it('fits 2 × 2 in photos on a 4 × 6 in sheet', () => {
    const g = layout(sheet('4x6'), photo('2x2'), 0);
    expect(g.count).toBe(6);
  });

  it('centers the block of photos on the sheet', () => {
    const g = layout(sheet('a4'), photo('35x45'), 2);
    const used = g.columns * 35 + (g.columns - 1) * 2;
    expect(g.left).toBeCloseTo((g.sheet.width - used) / 2);
  });
});

describe('gapCost', () => {
  it('reports the copies a gap costs', () => {
    expect(gapCost(sheet('4x6'), photo('35x45'), 5)).toEqual({ free: 8, actual: 6, lost: 2 });
  });

  it('reports nothing for a gap that costs nothing', () => {
    expect(gapCost(sheet('4x6'), photo('35x45'), 1).lost).toBe(0);
  });
});

describe('cells', () => {
  it('gives one corner per photo, inside the sheet', () => {
    const g = layout(sheet('4x6'), photo('35x45'), 2);
    const list = cells(g, photo('35x45'), 2, 300);
    expect(list).toHaveLength(g.count);
    const w = mmToPx(g.sheet.width, 300);
    const h = mmToPx(g.sheet.height, 300);
    for (const c of list) {
      expect(c.x).toBeGreaterThanOrEqual(0);
      expect(c.y).toBeGreaterThanOrEqual(0);
      expect(c.x + mmToPx(35, 300)).toBeLessThanOrEqual(w);
      expect(c.y + mmToPx(45, 300)).toBeLessThanOrEqual(h);
    }
  });

  it('has the sheet size in pixels the print shop expects', () => {
    expect(mmToPx(4 * 25.4, 300)).toBe(1200);
    expect(mmToPx(6 * 25.4, 600)).toBe(3600);
  });
});

describe('valid', () => {
  it('rejects sizes that make no sense', () => {
    expect(valid({ width: 35, height: 45 }, 2)).toBe(true);
    expect(valid({ width: 0, height: 45 }, 2)).toBe(false);
    expect(valid({ width: 35, height: 45 }, -1)).toBe(false);
  });
});
