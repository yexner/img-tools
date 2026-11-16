import { describe, expect, it } from 'vitest';
import { guessQuality, searchQuality } from './fit';

/** A fake encoder whose output size grows with quality, like a real one. */
const model = (scale: number) => async (q: number) => ({ size: Math.round(scale * q ** 1.6) });
const sizeOf = (v: { size: number }) => v.size;

describe('searchQuality', () => {
  it('finds a quality at or just below the best that fits, in at most 7 encodes', async () => {
    for (const scale of [3, 40, 200, 900, 5000]) {
      for (const target of [500, 2_000, 10_000, 50_000, 200_000]) {
        for (const start of [20, 40, 60, 75, 90]) {
          const encode = model(scale);
          const r = await searchQuality(encode, sizeOf, target, start);
          let expected = 0;
          for (let q = 1; q <= 100; q++) if ((await encode(q)).size <= target) expected = q;
          expect(r.passes).toBeLessThanOrEqual(7);
          // Seven encodes cannot always pin down the exact step, but a result never exceeds the target.
          const got = r.best?.quality ?? 0;
          expect(got).toBeLessThanOrEqual(expected);
          expect(expected - got).toBeLessThanOrEqual(2);
          if (r.best) expect(r.best.value.size).toBeLessThanOrEqual(target);
        }
      }
    }
  });

  it('hands back the smallest result when the target cannot be reached', async () => {
    const r = await searchQuality(model(1000), sizeOf, 100, 75);
    expect(r.best).toBeUndefined();
    expect(r.smallest.quality).toBe(1);
    expect(r.smallest.value.size).toBe(1000);
  });

  it('returns quality 100 when everything fits', async () => {
    const r = await searchQuality(model(1), sizeOf, 1_000_000, 90);
    expect(r.best?.quality).toBe(100);
  });
});

describe('guessQuality', () => {
  it('guesses higher quality for more bytes per pixel', () => {
    expect(guessQuality(0.01)).toBeLessThan(guessQuality(0.2));
    expect(guessQuality(0.2)).toBeLessThan(guessQuality(1));
  });
});
