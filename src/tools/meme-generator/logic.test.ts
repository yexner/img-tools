import { describe, expect, it } from 'vitest';
import { memeBox, outlineWidth } from './logic';

describe('memeBox', () => {
  it('keeps the text inside the picture and scales with it', () => {
    for (const [w, h] of [
      [400, 300],
      [1600, 1200],
      [800, 2400],
    ]) {
      const b = memeBox(w, h);
      expect(b.maxWidth).toBeLessThan(w);
      expect(b.maxHeight).toBeLessThan(h / 2);
      expect(b.minSize).toBeLessThan(b.maxSize);
      expect(b.maxLines).toBe(2);
    }
    expect(memeBox(1600, 1200).maxSize).toBeGreaterThan(memeBox(400, 300).maxSize * 3);
  });

  it('never gives a tiny or zero size on a very small picture', () => {
    expect(memeBox(20, 20).maxSize).toBeGreaterThanOrEqual(24);
    expect(memeBox(20, 20).minSize).toBeGreaterThanOrEqual(14);
  });

  it('draws a visible outline', () => {
    expect(outlineWidth(10)).toBeGreaterThanOrEqual(2);
    expect(outlineWidth(100)).toBeCloseTo(14);
  });
});
