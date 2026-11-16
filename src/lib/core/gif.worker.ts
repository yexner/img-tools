// Worker for everything GIF: reading an animation, changing it, writing one. It keeps the page responsive,
// and canceling a job is done by stopping this worker (see gifjob.ts).
import { CodedError } from './coded';
import { decodeGif, encodeGif, GifWriter, thin, uniqueColors, type GifFrame } from './gif';
import { canvasOf, ctx2d, resample } from './steps';

export type Scale = { factor: number } | { width: number; height: number } | null;

export type Request =
  | {
      kind: 'transform';
      bytes: ArrayBuffer;
      colors: number;
      /** Keep every Nth frame. */
      every: number;
      scale: Scale;
      /** Keep exactly the colors the animation already has, when there are 256 or fewer. */
      keepColors: boolean;
    }
  | { kind: 'frames'; bytes: ArrayBuffer }
  | {
      kind: 'make';
      images: ImageBitmap[];
      /** Milliseconds, one per image. */
      delays: number[];
      width: number;
      colors: number;
      loop: boolean;
    }
  | { kind: 'video-start'; width: number; height: number; colors: number; loop: boolean }
  | { kind: 'video-frame'; rgba: Uint8ClampedArray; delay: number }
  | { kind: 'video-end' };

export type Reply =
  | { id: number; ok: true; progress: number }
  | { id: number; ok: false; reason: string; message: string }
  | ({ id: number; ok: true; done: true } & Result);

export type Result =
  | {
      kind: 'gif';
      bytes: Uint8Array;
      width: number;
      height: number;
      frames: number;
      duration: number;
    }
  | { kind: 'frames'; frames: { png: Blob; delay: number }[]; width: number; height: number }
  | { kind: 'ack' };

/** More than this many bytes of decoded frames would not fit in memory on most devices. */
const MAX_BYTES = 1_000_000_000;

const post = (message: Reply, transfer: Transferable[] = []) =>
  (self as unknown as Worker).postMessage(message, transfer);

function scaled(f: GifFrame, w: number, h: number, nw: number, nh: number): Uint8ClampedArray {
  if (w === nw && h === nh) return f.rgba;
  const source = canvasOf(w, h);
  ctx2d(source).putImageData(new ImageData(f.rgba as Uint8ClampedArray<ArrayBuffer>, w, h), 0, 0);
  const out = resample(source, nw, nh);
  return ctx2d(out).getImageData(0, 0, out.width, out.height).data;
}

async function transform(id: number, r: Extract<Request, { kind: 'transform' }>) {
  const gif = decodeGif(new Uint8Array(r.bytes));
  if (gif.width * gif.height * 4 * gif.frames.length > MAX_BYTES) {
    throw new CodedError('too-large', 'This animation is too large to process on this device.');
  }
  const kept = thin(gif.frames, r.every);
  const nw = !r.scale
    ? gif.width
    : 'factor' in r.scale
      ? Math.max(1, Math.round(gif.width * r.scale.factor))
      : r.scale.width;
  const nh = !r.scale
    ? gif.height
    : 'factor' in r.scale
      ? Math.max(1, Math.round(gif.height * r.scale.factor))
      : r.scale.height;
  // Keeping the colors: each frame is mapped back onto the colors it had before it was resized.
  const writer = r.keepColors ? new GifWriter(nw, nh, { colors: 256, loop: true }) : null;
  const frames: { rgba: Uint8ClampedArray; delay: number }[] = [];
  kept.forEach((f, i) => {
    const rgba = scaled(f, gif.width, gif.height, nw, nh);
    if (writer) writer.add(rgba, f.delay, uniqueColors([f], 255) ?? undefined);
    else frames.push({ rgba, delay: f.delay });
    post({ id, ok: true, progress: (i + 1) / kept.length });
  });
  const bytes = writer
    ? writer.finish()
    : encodeGif(nw, nh, frames, { colors: r.colors, loop: true });
  return {
    kind: 'gif' as const,
    bytes,
    width: nw,
    height: nh,
    frames: kept.length,
    duration: kept.reduce((n, f) => n + f.delay, 0),
  };
}

async function frames(id: number, r: Extract<Request, { kind: 'frames' }>) {
  const gif = decodeGif(new Uint8Array(r.bytes));
  const out: { png: Blob; delay: number }[] = [];
  for (const [i, f] of gif.frames.entries()) {
    const canvas = canvasOf(gif.width, gif.height);
    ctx2d(canvas).putImageData(
      new ImageData(f.rgba as Uint8ClampedArray<ArrayBuffer>, gif.width, gif.height),
      0,
      0,
    );
    out.push({ png: await canvas.convertToBlob({ type: 'image/png' }), delay: f.delay });
    post({ id, ok: true, progress: (i + 1) / gif.frames.length });
  }
  return { kind: 'frames' as const, frames: out, width: gif.width, height: gif.height };
}

async function make(id: number, r: Extract<Request, { kind: 'make' }>) {
  const first = r.images[0];
  const width = Math.max(1, Math.round(r.width));
  const height = Math.max(1, Math.round((width * first.height) / first.width));
  const list: { rgba: Uint8ClampedArray; delay: number }[] = [];
  for (const [i, image] of r.images.entries()) {
    // Cut from the center so the picture has the first one's shape, then scale it to the output size.
    const k = Math.max(width / image.width, height / image.height);
    const sw = width / k;
    const sh = height / k;
    const part = canvasOf(sw, sh);
    ctx2d(part).drawImage(
      image,
      (image.width - sw) / 2,
      (image.height - sh) / 2,
      sw,
      sh,
      0,
      0,
      part.width,
      part.height,
    );
    const out = resample(part, width, height);
    // GIF has no partial transparency: a flat white behind transparent areas keeps edges clean.
    const flat = canvasOf(width, height);
    const g = ctx2d(flat);
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, width, height);
    g.drawImage(out, 0, 0);
    list.push({ rgba: g.getImageData(0, 0, width, height).data, delay: r.delays[i] });
    image.close();
    post({ id, ok: true, progress: (i + 1) / (r.images.length * 2) });
  }
  const bytes = encodeGif(width, height, list, { colors: r.colors, loop: r.loop });
  return {
    kind: 'gif' as const,
    bytes,
    width,
    height,
    frames: list.length,
    duration: list.reduce((n, f) => n + f.delay, 0),
  };
}

let writer: GifWriter | undefined;
let videoInfo = { width: 0, height: 0, frames: 0, duration: 0 };

async function handle(id: number, r: Request): Promise<Result> {
  switch (r.kind) {
    case 'transform':
      return transform(id, r);
    case 'frames':
      return frames(id, r);
    case 'make':
      return make(id, r);
    case 'video-start':
      writer = new GifWriter(r.width, r.height, { colors: r.colors, loop: r.loop });
      videoInfo = { width: r.width, height: r.height, frames: 0, duration: 0 };
      return { kind: 'ack' };
    case 'video-frame':
      if (!writer) throw new CodedError('encoder-failed', 'The GIF writer was not started.');
      writer.add(r.rgba, r.delay);
      videoInfo.frames++;
      videoInfo.duration += r.delay;
      return { kind: 'ack' };
    case 'video-end': {
      if (!writer) throw new CodedError('encoder-failed', 'The GIF writer was not started.');
      const bytes = writer.finish();
      writer = undefined;
      return { kind: 'gif', bytes, ...videoInfo };
    }
  }
}

self.onmessage = async (e: MessageEvent<{ id: number; request: Request }>) => {
  const { id, request } = e.data;
  try {
    const result = await handle(id, request);
    post({ id, ok: true, done: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    post({
      id,
      ok: false,
      reason:
        err instanceof CodedError
          ? err.reason
          : /memory|allocation/i.test(message)
            ? 'out-of-memory'
            : 'decode-failed',
      message: err instanceof CodedError ? message : 'This GIF could not be processed.',
    });
  }
};
