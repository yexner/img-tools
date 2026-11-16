import { describe, expect, it } from 'vitest';
import { colorOf, grown, sidesOf, total, type Options } from './logic';

const base: Options = {
  all: 20,
  each: { top: 1, right: 2, bottom: 3, left: 4 },
  fill: 'white',
  custom: '#336699',
};

describe('add-border logic', () => {
  it('uses one thickness for every side, or one per side', () => {
    expect(sidesOf(base)).toEqual({ top: 20, right: 20, bottom: 20, left: 20 });
    expect(sidesOf({ ...base, all: null })).toEqual({ top: 1, right: 2, bottom: 3, left: 4 });
  });

  it('cleans up odd numbers', () => {
    expect(sidesOf({ ...base, all: -5 })).toEqual({ top: 0, right: 0, bottom: 0, left: 0 });
    expect(sidesOf({ ...base, all: 7.6 }).top).toBe(8);
    expect(
      sidesOf({ ...base, all: null, each: { top: NaN, right: 2.4, bottom: 3, left: 4 } }).top,
    ).toBe(0);
  });

  it('grows the picture outward', () => {
    expect(grown(100, 50, { top: 1, right: 2, bottom: 3, left: 4 })).toEqual({
      width: 106,
      height: 54,
    });
    expect(total({ top: 1, right: 2, bottom: 3, left: 4 })).toBe(10);
  });

  it('maps the color choice', () => {
    expect(colorOf(base)).toBe('#ffffff');
    expect(colorOf({ ...base, fill: 'black' })).toBe('#000000');
    expect(colorOf({ ...base, fill: 'transparent' })).toBeNull();
    expect(colorOf({ ...base, fill: 'custom' })).toBe('#336699');
  });
});
