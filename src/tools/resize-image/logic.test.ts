import { describe, expect, it } from 'vitest';
import { stepFor, targetSize, valid, type Options } from './logic';

const base: Options = { mode: 'edge', edge: 1600, lock: true, driving: 'w', percent: 50 };

describe('targetSize', () => {
  it('shrinks to the longest edge and never enlarges', () => {
    expect(targetSize({ width: 4000, height: 3000 }, base)).toEqual({ width: 1600, height: 1200 });
    expect(targetSize({ width: 3000, height: 4000 }, base)).toEqual({ width: 1200, height: 1600 });
    expect(targetSize({ width: 800, height: 600 }, base)).toEqual({ width: 800, height: 600 });
  });

  it('scales by percent', () => {
    const o = { ...base, mode: 'percent' as const };
    expect(targetSize({ width: 1001, height: 501 }, o)).toEqual({ width: 501, height: 251 });
    expect(targetSize({ width: 100, height: 100 }, { ...o, percent: 200 })).toEqual({
      width: 200,
      height: 200,
    });
  });

  it('keeps proportions from the side that was typed last', () => {
    const o = { ...base, mode: 'exact' as const, width: 800, height: 999 };
    expect(targetSize({ width: 4000, height: 3000 }, o)).toEqual({ width: 800, height: 600 });
    expect(targetSize({ width: 3000, height: 4000 }, { ...o, driving: 'h', height: 800 })).toEqual({
      width: 600,
      height: 800,
    });
  });

  it('stretches to an exact size when proportions are not locked', () => {
    const o = { ...base, mode: 'exact' as const, lock: false, width: 500, height: 100 };
    expect(targetSize({ width: 4000, height: 3000 }, o)).toEqual({ width: 500, height: 100 });
  });
});

describe('stepFor / valid', () => {
  it('picks the pipeline call', () => {
    expect(stepFor(base)).toEqual({ limit: 1600 });
    expect(stepFor({ ...base, mode: 'percent' })).toEqual({ scale: 0.5 });
    expect(stepFor({ ...base, mode: 'exact', width: 300 })).toEqual({ w: 300 });
    expect(stepFor({ ...base, mode: 'exact', lock: false, width: 300, height: 200 })).toEqual({
      w: 300,
      h: 200,
    });
  });

  it('rejects incomplete settings', () => {
    expect(valid({ ...base, mode: 'exact' })).toBe(false);
    expect(valid({ ...base, mode: 'exact', lock: false, width: 300 })).toBe(false);
    expect(valid({ ...base, edge: 0 })).toBe(false);
    expect(valid(base)).toBe(true);
  });
});
