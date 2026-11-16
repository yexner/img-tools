import { describe, expect, it } from 'vitest';
import { socialSizes } from '#lib/data/social-sizes';
import { cutFor } from './logic';

describe('cutFor', () => {
  it('cuts the right shape for every size, so scaling never stretches', () => {
    for (const bounds of [
      { w: 4000, h: 3000 },
      { w: 3000, h: 4000 },
      { w: 1000, h: 1000 },
      { w: 640, h: 360 },
    ]) {
      for (const size of socialSizes) {
        const cut = cutFor(size, bounds, { x: 0.3, y: 0.7 });
        // Whole-pixel rounding allows a tiny difference in shape.
        expect(
          Math.abs(cut.w / cut.h - size.width / size.height) / (size.width / size.height),
        ).toBeLessThan(1.5 / Math.min(cut.w, cut.h));
        expect(cut.x + cut.w).toBeLessThanOrEqual(bounds.w);
        expect(cut.y + cut.h).toBeLessThanOrEqual(bounds.h);
      }
    }
  });

  it('is centered on the focal point', () => {
    const header = socialSizes.find((s) => s.platform === 'X' && s.id === 'header')!; // 3:1
    const cut = cutFor(header, { w: 3000, h: 3000 }, { x: 0.5, y: 0.2 });
    expect(cut).toEqual({ x: 0, y: 100, w: 3000, h: 1000 });
  });
});
