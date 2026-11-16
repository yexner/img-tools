import { describe, expect, it } from 'vitest';
import { even, timeline } from './logic';

describe('gif-to-mp4 logic', () => {
  it('makes sizes even', () => {
    expect([even(101), even(100), even(1), even(2)]).toEqual([100, 100, 2, 2]);
  });

  it('lays frames out one after another', () => {
    const t = timeline([100, 250, 50]);
    expect(t.map((f) => f.start)).toEqual([0, 0.1, 0.35]);
    expect(t.map((f) => f.duration)).toEqual([0.1, 0.25, 0.05]);
  });
});
