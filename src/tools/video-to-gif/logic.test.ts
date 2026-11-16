import { describe, expect, it } from 'vitest';
import { clock, countFrames, MAX_FRAMES, outputSize, plan } from './logic';

describe('countFrames', () => {
  it('counts whole frames in the clip', () => {
    expect(countFrames(0, 5, 8)).toBe(40);
    expect(countFrames(1, 3.5, 10)).toBe(25);
    expect(countFrames(0, 0.01, 8)).toBe(1); // a very short clip still gives one frame
    expect(countFrames(2, 2, 8)).toBe(0);
    expect(countFrames(3, 2, 8)).toBe(0);
  });

  it('shows when a clip is over the limit', () => {
    expect(countFrames(0, 20, 8)).toBeGreaterThan(MAX_FRAMES);
    expect(countFrames(0, 18, 8)).toBeLessThanOrEqual(MAX_FRAMES);
  });
});

describe('plan', () => {
  it('takes frames evenly from the start time', () => {
    const p = plan(1, 2, 5);
    expect(p.times).toEqual([1, 1.2, 1.4, 1.6, 1.8].map((t) => expect.closeTo(t, 6)));
  });

  it('makes the animation last as long as the clip, even when the delay is not a whole hundredth', () => {
    for (const fps of [5, 8, 10, 12, 15]) {
      const p = plan(0, 6, fps);
      const total = p.delays.reduce((n, d) => n + d, 0);
      expect(Math.abs(total - p.frames * (1000 / fps))).toBeLessThanOrEqual(10);
      for (const d of p.delays) expect(d % 10).toBe(0);
    }
    expect(plan(0, 1, 8).delays.slice(0, 4)).toEqual([130, 120, 130, 120]);
  });
});

describe('outputSize', () => {
  it('keeps the shape and never enlarges', () => {
    expect(outputSize(1920, 1080, 640)).toEqual({ width: 640, height: 360 });
    expect(outputSize(1920, 1080, 'original')).toEqual({ width: 1920, height: 1080 });
    expect(outputSize(300, 200, 640)).toEqual({ width: 300, height: 200 });
  });
});

describe('clock', () => {
  it('writes minutes and seconds', () => {
    expect(clock(5)).toBe('0:05.0');
    expect(clock(83.44)).toBe('1:23.4');
  });
});
