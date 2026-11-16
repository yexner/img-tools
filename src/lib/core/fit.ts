// "Best quality that fits under a size", found with a bounded search. Kept apart from the worker
// so it can be tested with a fake encoder.

/** Rough first guess for the quality that gives about `bytesPerPixel`, so the search needs few passes. */
export function guessQuality(bytesPerPixel: number): number {
  const bits = bytesPerPixel * 8;
  return bits < 0.3 ? 20 : bits < 0.6 ? 40 : bits < 1.2 ? 60 : bits < 2 ? 75 : 90;
}

export interface Fit<T> {
  value: T;
  quality: number;
}

/**
 * Looks for the highest quality (1 to 100) whose result is at most `maxBytes`, assuming size grows with
 * quality. Needs at most 7 encodes. When even quality 1 is too big, `best` is undefined and `smallest`
 * is the result to hand back, marked as "target not reached".
 */
export async function searchQuality<T>(
  encodeAt: (quality: number) => Promise<T>,
  sizeOf: (value: T) => number,
  maxBytes: number,
  start: number,
  maxPasses = 7,
): Promise<{ best?: Fit<T>; smallest: Fit<T>; passes: number }> {
  let best: Fit<T> | undefined;
  let smallest: Fit<T> | undefined;
  let lo = 0; // highest quality known to fit; 0 = none yet
  let hi = 101; // lowest quality known not to fit; 101 = none yet
  let probe = Math.min(100, Math.max(1, Math.round(start)));
  let passes = 0;
  while (passes < maxPasses) {
    const value = await encodeAt(probe);
    passes++;
    if (!smallest || sizeOf(value) < sizeOf(smallest.value)) smallest = { value, quality: probe };
    if (sizeOf(value) <= maxBytes) {
      lo = probe;
      best = { value, quality: probe };
    } else {
      hi = probe;
    }
    if (hi - lo <= 1) break;
    probe = Math.floor((lo + hi) / 2);
  }
  return { best, smallest: smallest!, passes };
}
