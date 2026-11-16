import { CodedError } from './coded';
import type { EncodeFormat, EncodeOptions, InitMessage, Job, Reply } from './ops';
import { apply, canvasOf, ctx2d } from './steps';
import { guessQuality, searchQuality } from './fit';
import { sniff } from './formats';
import { stripPng } from './png';

const MIME = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  avif: 'image/avif',
} as const;

/** JPG has no transparency: transparent areas become white unless told otherwise. */
function flatten(canvas: OffscreenCanvas, o: EncodeOptions): OffscreenCanvas {
  if (o.format !== 'jpeg' && !o.background) return canvas;
  const source = canvasOf(canvas.width, canvas.height);
  const ctx = ctx2d(source);
  ctx.fillStyle = o.background ?? '#ffffff';
  ctx.fillRect(0, 0, source.width, source.height);
  ctx.drawImage(canvas, 0, 0);
  return source;
}

async function encodeFlat(source: OffscreenCanvas, format: EncodeFormat, quality: number) {
  if (format !== 'avif') {
    // Browsers silently return a PNG for formats they cannot write, so the type is checked.
    const blob = await source.convertToBlob({
      type: MIME[format],
      quality: format === 'png' ? undefined : quality / 100,
    });
    if (blob.type === MIME[format]) return blob;
    if (format !== 'webp') {
      throw new CodedError('encoder-failed', `This browser cannot write ${format.toUpperCase()}.`);
    }
  }
  // AVIF is always WASM; WebP only where the browser cannot write it (Safari).
  const pixels = ctx2d(source).getImageData(0, 0, source.width, source.height);
  if (format === 'avif') {
    const { avifReady, encodeAvif } = await import('../codecs/wasm/avif');
    if (!avifReady()) throw new CodedError('needs-download', 'The AVIF encoder is not loaded yet.');
    return encodeAvif(pixels, quality);
  }
  const { webpReady, encodeWebp } = await import('../codecs/wasm/webp');
  if (!webpReady()) throw new CodedError('needs-download', 'The WebP encoder is not loaded yet.');
  return encodeWebp(pixels, quality);
}

const encode = (canvas: OffscreenCanvas, o: EncodeOptions) =>
  encodeFlat(flatten(canvas, o), o.format, o.quality ?? 90);

/** Best quality whose file fits under `maxBytes`, in at most 7 encodes. */
async function fit(canvas: OffscreenCanvas, o: EncodeOptions, maxBytes: number) {
  const source = flatten(canvas, o);
  const { best, smallest } = await searchQuality(
    (q) => encodeFlat(source, o.format, q),
    (blob) => blob.size,
    maxBytes,
    guessQuality(maxBytes / (source.width * source.height)),
  );
  const chosen = best ?? smallest;
  return { blob: chosen.value, quality: chosen.quality, reached: best !== undefined };
}

/** PNG optimized with oxipng, optionally with fewer colors. The smaller of the two results wins. */
async function optimizedPng(job: Job, canvas: OffscreenCanvas, colors?: number) {
  const { oxipngReady, optimizePng, optimizeRaw, reduceColors } =
    await import('../codecs/wasm/oxipng');
  if (!oxipngReady())
    throw new CodedError('needs-download', 'The PNG optimizer is not loaded yet.');
  const { width, height } = canvas;
  const pixels = ctx2d(canvas).getImageData(0, 0, width, height);
  const asBlob = (bytes: Uint8Array) => new Blob([bytes as BlobPart], { type: 'image/png' });
  // Lossless: the original file when nothing was changed, so not even rounding can alter a pixel.
  const untouched = job.steps.length === 0 && !job.pixels && (await sniff(job.file)) === 'png';
  const lossless = untouched
    ? optimizePng(stripPng(new Uint8Array(await job.file.arrayBuffer())))
    : optimizeRaw(pixels.data, width, height);
  if (!colors) return { blob: asBlob(lossless), note: undefined };
  const reduced = reduceColors(pixels.data, colors);
  const fewer = optimizeRaw(reduced, width, height);
  return fewer.length < lossless.length
    ? { blob: asBlob(fewer), note: undefined }
    : {
        blob: asBlob(lossless),
        note: 'Reducing colors would not help here, so the lossless result was used.',
      };
}

async function decode(job: Job): Promise<OffscreenCanvas> {
  if (job.pixels) {
    const { data, width, height } = job.pixels;
    const canvas = canvasOf(width, height);
    ctx2d(canvas).putImageData(new ImageData(new Uint8ClampedArray(data), width, height), 0, 0);
    return canvas;
  }
  if ((await sniff(job.file)) === 'tiff') {
    try {
      const { decodeTiff } = await import('../codecs/wasm/tiff');
      const { data, width, height } = decodeTiff(await job.file.arrayBuffer(), job.page ?? 0);
      const canvas = canvasOf(width, height);
      ctx2d(canvas).putImageData(new ImageData(data, width, height), 0, 0);
      return canvas;
    } catch (err) {
      if (err instanceof CodedError) throw err;
      throw new CodedError('decode-failed', 'This TIFF uses a variant that cannot be read.');
    }
  }
  let bitmap: ImageBitmap;
  try {
    // Applies EXIF orientation by default, so photos stay upright.
    bitmap = await createImageBitmap(job.file);
  } catch {
    throw new CodedError('decode-failed', 'This file could not be read as an image.');
  }
  const canvas = canvasOf(bitmap.width, bitmap.height);
  ctx2d(canvas).drawImage(bitmap, 0, 0);
  bitmap.close();
  return canvas;
}

async function run(job: Job): Promise<Reply> {
  let canvas = await decode(job);
  for (const step of job.steps) canvas = apply(canvas, step);
  const { width, height } = canvas;
  if (job.raw) {
    const data = ctx2d(canvas).getImageData(0, 0, width, height).data.buffer as ArrayBuffer;
    return { id: job.id, ok: true, raw: { data, width, height }, width, height };
  }
  const task = job.task;
  if (task?.kind === 'fit') {
    return {
      id: job.id,
      ok: true,
      width,
      height,
      ...(await fit(canvas, job.encode, task.maxBytes)),
    };
  }
  if (task?.kind === 'png') {
    return {
      id: job.id,
      ok: true,
      width,
      height,
      ...(await optimizedPng(job, canvas, task.colors)),
    };
  }
  const blob = await encode(canvas, job.encode);
  return { id: job.id, ok: true, blob, width, height };
}

async function init(msg: InitMessage): Promise<Reply> {
  try {
    let module: WebAssembly.Module | undefined;
    if (msg.codec === 'avif-enc') {
      module = await (await import('../codecs/wasm/avif')).initAvif(msg.module);
    } else if (msg.codec === 'webp-enc') {
      module = await (await import('../codecs/wasm/webp')).initWebp(msg.module);
    } else if (msg.codec === 'oxipng') {
      module = await (await import('../codecs/wasm/oxipng')).initOxipng(msg.module);
    } else {
      await import('../codecs/wasm/tiff');
    }
    return { cmd: 'init', codec: msg.codec, ok: true, module };
  } catch {
    return { cmd: 'init', codec: msg.codec, ok: false };
  }
}

async function handle(data: Job | InitMessage): Promise<Reply> {
  if ('cmd' in data) return init(data);
  try {
    return await run(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const reason =
      err instanceof CodedError
        ? err.reason
        : /memory|allocation/i.test(message)
          ? 'out-of-memory'
          : 'encoder-failed';
    return { id: data.id, ok: false, reason, message };
  }
}

// Messages are handled one after another, so a job never starts before the codec init that preceded it.
let queue: Promise<unknown> = Promise.resolve();
self.onmessage = (e: MessageEvent<Job | InitMessage>) => {
  queue = queue.then(async () => {
    const reply = await handle(e.data);
    const transfer = 'raw' in reply && reply.raw ? [reply.raw.data] : [];
    (self as unknown as Worker).postMessage(reply, transfer);
  });
};
