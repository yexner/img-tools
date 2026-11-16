import { describe, expect, it } from 'vitest';
import { FORMAT_QUALITY, showsQuality, trackedQuality } from './formatQuality.svelte';

describe('formatQuality helpers', () => {
  it('keeps the per-format defaults', () => {
    expect(FORMAT_QUALITY).toEqual({ original: 90, jpeg: 90, png: 90, webp: 80, avif: 75 });
  });
  it('hides the slider and the tracked quality only for PNG', () => {
    expect(showsQuality('png')).toBe(false);
    expect(showsQuality('original')).toBe(true);
    expect(showsQuality('avif')).toBe(true);
    expect(trackedQuality('png', 90)).toBeUndefined();
    expect(trackedQuality('webp', 80)).toBe(80);
  });
});
