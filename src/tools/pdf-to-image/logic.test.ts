import { describe, expect, it } from 'vitest';
import { LARGE_PIXELS, pageSuffix, planPage } from './logic';

describe('planPage', () => {
  it('scales an A4 page to the requested resolution', () => {
    const p = planPage(595, 842, 150, 100_000_000);
    expect(p.scale).toBeCloseTo(150 / 72);
    expect(p.dpi).toBe(150);
    expect(p.reduced).toBe(false);
    expect(p.pixels).toBeCloseTo(1240 * 1754, -4);
  });

  it('lowers the resolution when the page would be too big', () => {
    const p = planPage(595, 842, 300, 4_000_000);
    expect(p.reduced).toBe(true);
    expect(p.pixels).toBeLessThanOrEqual(4_000_000);
    expect(p.pixels).toBeGreaterThan(3_900_000);
    expect(p.dpi).toBeLessThan(300);
  });

  it('flags a poster as large', () => {
    expect(planPage(2384, 3370, 300, 1e9).pixels).toBeGreaterThan(LARGE_PIXELS);
    expect(planPage(595, 842, 300, 1e9).pixels).toBeLessThan(LARGE_PIXELS);
  });
});

describe('pageSuffix', () => {
  it('pads to the width of the page count', () => {
    expect(pageSuffix(1, 9)).toBe('page-1');
    expect(pageSuffix(7, 12)).toBe('page-07');
    expect(pageSuffix(7, 120)).toBe('page-007');
  });
});
