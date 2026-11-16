import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { decodeGif, encodeGif, GifWriter, playbackDelay, thin, uniqueColors } from './gif';

const anim = new Uint8Array(readFileSync('tests/fixtures/anim.gif'));

/** Frames as ffmpeg composites them, or null when ffmpeg is not installed. */
function ffmpegFrames(): Uint8Array | null {
  try {
    return new Uint8Array(
      execFileSync(
        'ffmpeg',
        [
          '-loglevel',
          'error',
          '-i',
          'tests/fixtures/anim.gif',
          '-f',
          'rawvideo',
          '-pix_fmt',
          'rgba',
          '-',
        ],
        {
          maxBuffer: 1 << 26,
        },
      ),
    );
  } catch {
    return null;
  }
}

const solid = (w: number, h: number, rgba: number[]) => {
  const a = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < a.length; i += 4) a.set(rgba, i);
  return a;
};

describe('decodeGif', () => {
  it('reads size, frame count and delays', () => {
    const gif = decodeGif(anim);
    expect([gif.width, gif.height]).toEqual([96, 72]);
    expect(gif.frames).toHaveLength(7);
    for (const f of gif.frames) {
      expect(f.rgba.length).toBe(96 * 72 * 4);
      expect(f.delay).toBeGreaterThan(100);
    }
  });

  it('composites frames exactly like ffmpeg does', () => {
    const reference = ffmpegFrames();
    if (!reference) return; // ffmpeg is optional
    const gif = decodeGif(anim);
    const size = 96 * 72 * 4;
    expect(reference.length).toBe(size * gif.frames.length);
    gif.frames.forEach((f, i) => {
      let worst = 0;
      for (let p = 0; p < size; p++)
        worst = Math.max(worst, Math.abs(f.rgba[p] - reference[i * size + p]));
      expect(worst, `frame ${i}`).toBe(0);
    });
  });

  it('shows the playback delay browsers use for 0 and 1 hundredths', () => {
    expect(playbackDelay(0)).toBe(100);
    expect(playbackDelay(10)).toBe(100);
    expect(playbackDelay(20)).toBe(20);
    expect(playbackDelay(500)).toBe(500);
  });
});

describe('encodeGif', () => {
  const frames = [
    { rgba: solid(8, 6, [255, 0, 0, 255]), delay: 100 },
    { rgba: solid(8, 6, [0, 255, 0, 255]), delay: 250 },
    { rgba: solid(8, 6, [0, 0, 255, 255]), delay: 400 },
  ];

  it('writes frames, delays and loop flag that read back the same', () => {
    const bytes = encodeGif(8, 6, frames, { colors: 16, loop: true });
    const gif = decodeGif(bytes);
    expect(gif.frames.map((f) => f.delay)).toEqual([100, 250, 400]);
    expect([...gif.frames[1].rgba.subarray(0, 4)]).toEqual([0, 255, 0, 255]);
    // The "loop forever" extension is present; "play once" leaves it out.
    expect(new TextDecoder('latin1').decode(bytes)).toContain('NETSCAPE2.0');
    const once = encodeGif(8, 6, frames, { colors: 16, loop: false });
    expect(new TextDecoder('latin1').decode(once)).not.toContain('NETSCAPE2.0');
  });

  it('keeps transparent pixels transparent and clears between frames', () => {
    const half = (alphaLeft: number) => {
      const a = solid(8, 6, [200, 50, 50, 255]);
      for (let y = 0; y < 6; y++) for (let x = 0; x < 4; x++) a[(y * 8 + x) * 4 + 3] = alphaLeft;
      return a;
    };
    const bytes = encodeGif(
      8,
      6,
      [
        { rgba: half(0), delay: 100 },
        { rgba: half(0), delay: 100 },
      ],
      { colors: 8, loop: true },
    );
    const gif = decodeGif(bytes);
    for (const f of gif.frames) {
      expect(f.rgba[3]).toBe(0); // left side stays see-through in every frame
      expect(f.rgba[(0 * 8 + 6) * 4 + 3]).toBe(255);
    }
  });

  it('round-trips a real animation with little change', () => {
    const src = decodeGif(anim);
    const out = decodeGif(
      encodeGif(src.width, src.height, src.frames, { colors: 256, loop: true }),
    );
    expect(out.frames).toHaveLength(src.frames.length);
    let total = 0;
    let count = 0;
    src.frames.forEach((f, i) => {
      for (let p = 0; p < f.rgba.length; p++) {
        if (p % 4 === 3) continue;
        total += Math.abs(f.rgba[p] - out.frames[i].rgba[p]);
        count++;
      }
    });
    expect(total / count).toBeLessThan(6); // the average color moves by less than 6 of 255
    expect(out.frames.map((f) => f.delay)).toEqual(
      src.frames.map((f) => Math.round(f.delay / 10) * 10),
    );
  });

  it('uses fewer colors when asked, and makes a smaller file', () => {
    const src = decodeGif(anim);
    const big = encodeGif(src.width, src.height, src.frames, { colors: 256, loop: true });
    const small = encodeGif(src.width, src.height, src.frames, { colors: 16, loop: true });
    expect(small.length).toBeLessThan(big.length);
  });
});

describe('thin', () => {
  const frames = Array.from({ length: 7 }, (_, i) => ({ id: i, delay: 100 + i * 10 }));
  const total = (list: { delay: number }[]) => list.reduce((n, f) => n + f.delay, 0);

  it('keeps every Nth frame and the total running time', () => {
    for (const every of [1, 2, 3, 5, 10]) {
      const out = thin(frames, every);
      expect(out.length).toBe(Math.ceil(frames.length / every));
      expect(total(out)).toBe(total(frames));
      expect(out[0].id).toBe(0);
    }
    expect(thin(frames, 2).map((f) => f.id)).toEqual([0, 2, 4, 6]);
    expect(thin(frames, 3).map((f) => f.delay)).toEqual([330, 420, 160]);
  });
});

describe('uniqueColors', () => {
  it('lists distinct opaque colors and gives up above the limit', () => {
    const a = { rgba: solid(4, 4, [1, 2, 3, 255]) };
    const b = { rgba: solid(4, 4, [9, 9, 9, 255]) };
    const clear = { rgba: solid(4, 4, [50, 50, 50, 0]) };
    expect(uniqueColors([a, b, clear])).toEqual([
      [1, 2, 3],
      [9, 9, 9],
    ]);
    const many = new Uint8ClampedArray(300 * 4);
    for (let i = 0; i < 300; i++) many.set([i % 256, Math.floor(i / 256), 0, 255], i * 4);
    expect(uniqueColors([{ rgba: many }])).toBeNull();
  });

  it('lets a GIF keep exactly its own colors', () => {
    const src = decodeGif(anim);
    const palette = uniqueColors(src.frames);
    if (!palette) return; // a photo-like animation can have more than 256 colors
    const out = decodeGif(
      encodeGif(src.width, src.height, src.frames, { colors: 256, loop: true, palette }),
    );
    const colors = uniqueColors(out.frames, 300)!;
    for (const c of colors)
      expect(palette.some((p) => p[0] === c[0] && p[1] === c[1] && p[2] === c[2])).toBe(true);
  });
});

describe('GifWriter', () => {
  it('writes frames one at a time, each with its own colors', () => {
    const w = new GifWriter(8, 6, { colors: 16, loop: true });
    w.add(solid(8, 6, [255, 0, 0, 255]), 100);
    w.add(solid(8, 6, [0, 0, 255, 255]), 300);
    const gif = decodeGif(w.finish());
    expect(gif.frames.map((f) => f.delay)).toEqual([100, 300]);
    expect([...gif.frames[1].rgba.subarray(0, 4)]).toEqual([0, 0, 255, 255]);
  });
});
