import { describe, expect, it } from 'vitest';
import { boxFor, resultSize, valid, type Options } from './logic';

const o: Options = { width: 4, height: 6, unit: 'in', dpi: 300, fit: 'within' };

describe('boxFor', () => {
  it('turns the box to match the photo', () => {
    expect(boxFor({ width: 3000, height: 2000 }, o)).toEqual({ width: 1800, height: 1200 });
    expect(boxFor({ width: 2000, height: 3000 }, o)).toEqual({ width: 1200, height: 1800 });
    expect(boxFor(null, o)).toEqual({ width: 1200, height: 1800 });
  });

  it('leaves square photos and square boxes alone', () => {
    expect(boxFor({ width: 1000, height: 1000 }, o)).toEqual({ width: 1200, height: 1800 });
    expect(boxFor({ width: 3000, height: 2000 }, { ...o, width: 5, height: 5 })).toEqual({
      width: 1500,
      height: 1500,
    });
  });

  it('handles metric sizes', () => {
    const a4 = { ...o, width: 210, height: 297, unit: 'mm' as const };
    expect(boxFor({ width: 2000, height: 3000 }, a4)).toEqual({ width: 2480, height: 3508 });
  });
});

describe('resultSize', () => {
  it('fits within the box without distortion, and can enlarge', () => {
    // 3:2 photo into a 6x4 box (1800x1200): same shape, so it fills the box.
    expect(resultSize({ width: 600, height: 400 }, o)).toEqual({ width: 1800, height: 1200 });
    // 16:9 photo is narrower than the box shape: height decides.
    expect(resultSize({ width: 1600, height: 900 }, o)).toEqual({ width: 1800, height: 1013 });
  });

  it('fills the whole box when cropping or stretching', () => {
    expect(resultSize({ width: 1600, height: 900 }, { ...o, fit: 'fill' })).toEqual({
      width: 1800,
      height: 1200,
    });
    expect(resultSize({ width: 1600, height: 900 }, { ...o, fit: 'stretch' })).toEqual({
      width: 1800,
      height: 1200,
    });
  });
});

describe('valid', () => {
  it('needs a positive size', () => {
    expect(valid(o)).toBe(true);
    expect(valid({ ...o, width: 0 })).toBe(false);
    expect(valid({ ...o, dpi: 0 })).toBe(false);
  });
});
