import { describe, expect, it } from 'vitest';
import { fromInches, tidy, toInches, toPx } from './units';

describe('units', () => {
  it('converts to inches', () => {
    expect(toInches(1, 'in')).toBe(1);
    expect(toInches(2.54, 'cm')).toBeCloseTo(1);
    expect(toInches(25.4, 'mm')).toBeCloseTo(1);
  });

  it('converts back', () => {
    expect(tidy(fromInches(4, 'cm'))).toBe(10.16);
    expect(tidy(fromInches(8.5, 'mm'))).toBe(215.9);
    expect(fromInches(3, 'in')).toBe(3);
  });

  it('gives pixels at a resolution', () => {
    expect(toPx(4, 'in', 300)).toBe(1200);
    expect(toPx(21, 'cm', 300)).toBe(2480); // A4 width at 300 DPI
    expect(toPx(297, 'mm', 300)).toBe(3508); // A4 height at 300 DPI
    expect(toPx(10, 'cm', 150)).toBe(591);
    expect(toPx(0.001, 'mm', 72)).toBe(1);
  });
});

describe('formatSize', () => {
  it('writes sizes in both systems', async () => {
    const { formatLength, formatRange, formatSize } = await import('./units');
    expect(formatSize(35, 45)).toBe('3.5 cm × 4.5 cm (1.38 in × 1.77 in)');
    expect(formatSize(101.6, 152.4)).toBe('10.2 cm × 15.2 cm (4 in × 6 in)');
    expect(formatLength(25.4)).toBe('2.5 cm (1 in)');
    expect(formatRange(25, 35)).toBe('2.5–3.5 cm (0.98–1.38 in)');
  });
});
