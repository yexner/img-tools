// GIF reading and writing without a canvas: frames are composited here, so the result is the same in every
// browser and the code can be tested in Node. gifuct-js reads, gifenc writes, the rest is ours.
import { applyPalette, GIFEncoder, quantize, type Palette } from 'gifenc';
import { decompressFrames, parseGIF } from 'gifuct-js';

export interface GifFrame {
  /** The whole picture as it looks while this frame is showing (RGBA, `width * height * 4`). */
  rgba: Uint8ClampedArray;
  /** How long it stays, in milliseconds, the way browsers play it. */
  delay: number;
}

interface Gif {
  width: number;
  height: number;
  frames: GifFrame[];
}

/**
 * Browsers show a frame whose delay is 0 or 1 hundredth of a second for 100 ms, because old GIFs
 * used those values to mean "as fast as you can" and they would flash by otherwise.
 */
export const playbackDelay = (ms: number) => (ms <= 10 ? 100 : ms);

/** Every frame of a GIF as a complete picture, with disposal methods and transparency applied. */
export function decodeGif(bytes: Uint8Array): Gif {
  const buffer = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
  const gif = parseGIF(buffer);
  const parts = decompressFrames(gif, true);
  const width = gif.lsd.width;
  const height = gif.lsd.height;
  const canvas = new Uint8ClampedArray(width * height * 4);
  const frames: GifFrame[] = [];
  let previous: Uint8ClampedArray | null = null;

  for (const part of parts) {
    // The previous frame's disposal is carried out before the next one is drawn.
    const { left, top, width: w, height: h } = part.dims;
    const before = canvas.slice();
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const src = (y * w + x) * 4;
        if (part.patch[src + 3] === 0) continue; // a transparent pixel leaves what is already there
        const cx = left + x;
        const cy = top + y;
        if (cx >= width || cy >= height) continue;
        canvas.set(part.patch.subarray(src, src + 4), (cy * width + cx) * 4);
      }
    }
    frames.push({ rgba: canvas.slice(), delay: playbackDelay(part.delay) });

    // Disposal: 2 = clear this frame's area, 3 = go back to how it was before this frame.
    if (part.disposalType === 2) {
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const cx = left + x;
          const cy = top + y;
          if (cx < width && cy < height)
            canvas.fill(0, (cy * width + cx) * 4, (cy * width + cx) * 4 + 4);
        }
      }
    } else if (part.disposalType === 3) {
      canvas.set(previous ?? before);
    }
    previous = before;
  }
  return { width, height, frames };
}

export interface EncodeOptions {
  /** 2 to 256. */
  colors: number;
  /** `true` repeats forever, `false` plays once. */
  loop: boolean;
  /** Use exactly these colors (nearest match) instead of choosing new ones. */
  palette?: Palette;
}

/**
 * Keep every `every`-th frame. Each kept frame stays on screen for the time of the frames it stands for,
 * so the animation lasts as long as before.
 */
export function thin<T extends { delay: number }>(frames: T[], every: number): T[] {
  if (every <= 1) return frames;
  const out: T[] = [];
  for (let i = 0; i < frames.length; i += every) {
    const group = frames.slice(i, i + every);
    out.push({ ...group[0], delay: group.reduce((n, f) => n + f.delay, 0) });
  }
  return out;
}

/** The distinct opaque colors of all frames, or null when there are more than `limit`. */
export function uniqueColors(frames: { rgba: Uint8ClampedArray }[], limit = 256): Palette | null {
  const seen = new Map<number, number[]>();
  for (const f of frames) {
    for (let i = 0; i < f.rgba.length; i += 4) {
      if (f.rgba[i + 3] < 128) continue;
      const key = (f.rgba[i] << 16) | (f.rgba[i + 1] << 8) | f.rgba[i + 2];
      if (!seen.has(key)) {
        if (seen.size >= limit) return null;
        seen.set(key, [f.rgba[i], f.rgba[i + 1], f.rgba[i + 2]]);
      }
    }
  }
  return [...seen.values()];
}

/** Whether any pixel is clearly see-through (GIF only has on or off). */
const hasTransparency = (rgba: Uint8ClampedArray) => {
  for (let i = 3; i < rgba.length; i += 4) if (rgba[i] < 128) return true;
  return false;
};

/**
 * Write frames as a GIF with one shared palette, chosen from all frames together so colors do not flicker.
 * Transparent pixels stay transparent, and each such frame clears the one before it.
 */
export function encodeGif(
  width: number,
  height: number,
  frames: { rgba: Uint8ClampedArray; delay: number }[],
  o: EncodeOptions,
): Uint8Array {
  const anyAlpha = frames.some((f) => hasTransparency(f.rgba));
  const format = anyAlpha ? 'rgba4444' : 'rgb565';
  // The palette comes from a sample of every frame, at most about a million pixels in total.
  const total = frames.reduce((n, f) => n + f.rgba.length / 4, 0);
  const every = Math.max(1, Math.ceil(total / 1_000_000));
  const sample = new Uint8ClampedArray(Math.ceil(total / every) * 4);
  let at = 0;
  for (const f of frames) {
    for (let p = 0; p < f.rgba.length; p += 4 * every) {
      sample.set(f.rgba.subarray(p, p + 4), at);
      at += 4;
    }
  }
  // One slot of the palette is kept for "transparent" when it is needed.
  const palette: Palette = o.palette
    ? o.palette.map((c) => [...c])
    : quantize(sample.subarray(0, at), anyAlpha ? o.colors - 1 : o.colors, {
        format,
        oneBitAlpha: anyAlpha,
        clearAlpha: anyAlpha,
      });
  let transparentIndex = -1;
  if (anyAlpha) {
    transparentIndex = palette.findIndex((c) => c.length === 4 && c[3] === 0);
    if (transparentIndex < 0) {
      palette.push([0, 0, 0, 0]);
      transparentIndex = palette.length - 1;
    }
  }

  const encoder = GIFEncoder();
  frames.forEach((f, i) => {
    const index = applyPalette(f.rgba, palette, format);
    if (anyAlpha) {
      // Pixels that are see-through in the frame take the transparent entry.
      for (let p = 0; p < index.length; p++)
        if (f.rgba[p * 4 + 3] < 128) index[p] = transparentIndex;
    }
    encoder.writeFrame(index, width, height, {
      palette: i === 0 ? palette : undefined,
      delay: Math.max(20, Math.round(f.delay)),
      repeat: o.loop ? 0 : -1,
      transparent: anyAlpha,
      transparentIndex: anyAlpha ? transparentIndex : 0,
      dispose: anyAlpha ? 2 : -1,
      first: i === 0,
    });
  });
  encoder.finish();
  return encoder.bytes();
}

/**
 * Writes a GIF one frame at a time, each with its own palette, so frames can be added as they are made
 * (video to GIF) without keeping them all in memory.
 */
export class GifWriter {
  private encoder = GIFEncoder();
  private first = true;

  constructor(
    private width: number,
    private height: number,
    private o: EncodeOptions,
  ) {}

  /** `colors` (when given) are used as they are, instead of choosing new ones for this frame. */
  add(rgba: Uint8ClampedArray, delay: number, colors?: Palette) {
    const alpha = hasTransparency(rgba);
    const format = alpha ? 'rgba4444' : 'rgb565';
    const palette: Palette = colors
      ? colors.map((c) => [...c])
      : quantize(rgba, alpha ? this.o.colors - 1 : this.o.colors, {
          format,
          oneBitAlpha: alpha,
          clearAlpha: alpha,
        });
    let transparentIndex = 0;
    if (alpha) {
      transparentIndex = palette.findIndex((c) => c.length === 4 && c[3] === 0);
      if (transparentIndex < 0) {
        palette.push([0, 0, 0, 0]);
        transparentIndex = palette.length - 1;
      }
    }
    const index = applyPalette(rgba, palette, format);
    if (alpha)
      for (let p = 0; p < index.length; p++) if (rgba[p * 4 + 3] < 128) index[p] = transparentIndex;
    this.encoder.writeFrame(index, this.width, this.height, {
      palette,
      delay: Math.max(20, Math.round(delay)),
      repeat: this.o.loop ? 0 : -1,
      transparent: alpha,
      transparentIndex,
      dispose: alpha ? 2 : -1,
      first: this.first,
    });
    this.first = false;
  }

  finish(): Uint8Array {
    this.encoder.finish();
    return this.encoder.bytes();
  }
}
