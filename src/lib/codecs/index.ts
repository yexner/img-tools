import { getPool } from '../core/pool';
import type { Codec } from '../types';

async function canvasWritesWebp(): Promise<boolean> {
  try {
    const canvas = new OffscreenCanvas(1, 1);
    canvas.getContext('2d'); // a canvas without a context cannot be encoded
    const blob = await canvas.convertToBlob({ type: 'image/webp' });
    return blob.type === 'image/webp';
  } catch {
    return false;
  }
}

/**
 * One memoized loader per big codec. Each loader fetches its WASM, compiles it once and keeps it in
 * memory so a later network loss does not matter.
 */
const loaders: Partial<Record<Codec, () => Promise<unknown>>> = {
  'avif-enc': async () => getPool().init({ cmd: 'init', codec: 'avif-enc' }),
  // Chromium and Firefox write WebP natively; only Safari needs the WASM encoder.
  'webp-enc': async () => {
    if (await canvasWritesWebp()) return;
    await getPool().init({ cmd: 'init', codec: 'webp-enc' });
  },
  svgo: async () => void (await import('svgo/browser')),
  serif: async () => {
    await import('../fonts-serif.css');
    await Promise.all(
      ['400 1em "Source Serif 4"', '700 1em "Source Serif 4"'].map((f) => document.fonts.load(f)),
    );
  },
  gif: async () => (await import('../core/gifjob')).warmGifWorker(),
  mp4: async () => void (await import('mediabunny')),
  oxipng: () => getPool().init({ cmd: 'init', codec: 'oxipng' }),
  pdfjs: async () => void (await import('./pdfjs')).loadPdfjs(),
  tiff: () => getPool().init({ cmd: 'init', codec: 'tiff' }),
  heic: async () => {
    const { nativeHeic, warmHeic } = await import('./heic');
    if (!(await nativeHeic())) await warmHeic();
  },
};

const started = new Map<Codec, Promise<unknown>>();

export function loadCodec(codec: Codec): Promise<unknown> {
  let p = started.get(codec);
  if (!p) {
    p = (loaders[codec]?.() ?? Promise.resolve()).catch((err) => {
      started.delete(codec); // a failed download can be tried again
      throw err;
    });
    started.set(codec, p);
  }
  return p;
}

/** Called when a tool page opens: loads everything the default settings need. */
export function warmCodecs(needs: Codec[] = []): Promise<unknown[]> {
  return Promise.all(needs.map(loadCodec));
}
