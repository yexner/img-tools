import type { InputKind, OutputFormat } from '#lib/types';
import { sniff } from './formats';
import type { EncodeFormat, Job, RawPixels, Step } from './ops';
import { getPool, JobError } from './pool';
import { withDpi } from './dpi';
import { isIdentity, type FilterOptions } from './filters';
import type { SingleOptions, TiledOptions } from './watermark';
import { tiffPageCount } from './tiff';
import { loadCodec } from '../codecs';

interface EncodeResult {
  blob: Blob;
  width: number;
  height: number;
  /** Set when "Original" had to become another format. */
  note?: string;
}

/** Which format "Original" resolves to, per source kind. */
export function resolveOriginal(kind: InputKind | null): { format: EncodeFormat; note?: string } {
  switch (kind) {
    case 'jpeg':
    case 'png':
    case 'webp':
      return { format: kind };
    case 'gif':
    case 'svg':
      return { format: 'png', note: 'Saved as PNG because the original format cannot be written.' };
    default:
      return {
        format: 'jpeg',
        note: 'Saved as JPG because the original format cannot be written.',
      };
  }
}

/** Set after the first HEIC file the browser could not decode itself; later files skip the failed attempt. */
let heicNeedsFallback = false;

/** Fluent description of image work. Nothing runs until `encode`; then it all happens in one worker round trip. */
export class Pipeline {
  private steps: Step[] = [];
  private pageIndex = 0;
  constructor(
    private file: Blob,
    private signal?: AbortSignal,
  ) {}

  private add(step: Step): this {
    this.steps.push(step);
    return this;
  }

  rotate(deg: 0 | 90 | 180 | 270): this {
    return deg === 0 ? this : this.add({ op: 'rotate', deg });
  }
  flip(h: boolean, v: boolean): this {
    return h || v ? this.add({ op: 'flip', h, v }) : this;
  }
  crop(x: number, y: number, w: number, h: number): this {
    return this.add({ op: 'crop', x, y, w, h });
  }
  resize(w: number, h: number, fit: 'contain' | 'cover' | 'stretch' = 'contain'): this {
    return this.add({ op: 'resize', w, h, fit });
  }

  /** Multiply both sides by `factor`, for example 0.5. */
  scale(factor: number): this {
    return this.add({ op: 'scale', factor });
  }
  /** Exact size. Give one side only to keep the picture's own proportions. */
  size(w?: number, h?: number): this {
    return this.add({ op: 'size', w, h });
  }
  /** Add space around the picture. `color` null leaves it transparent. */
  pad(top: number, right: number, bottom: number, left: number, color: string | null): this {
    return this.add({ op: 'pad', top, right, bottom, left, color });
  }
  /** Blur, pixelate or paint over parts of the picture (coordinates in picture pixels). */
  regions(
    style: 'blur' | 'pixelate' | 'fill',
    regions: { x: number; y: number; w: number; h: number; strength: number }[],
    color?: string,
    shape: 'rect' | 'oval' = 'rect',
  ): this {
    return regions.length ? this.add({ op: 'regions', style, color, shape, regions }) : this;
  }
  /** A watermark, drawn once (`single`) or repeated over the whole picture (`tiled`). */
  watermark(mark: ImageBitmap, layout: { single: SingleOptions } | { tiled: TiledOptions }): this {
    return this.add({ op: 'watermark', mark, ...layout } as Step);
  }
  /** Color looks and tone changes; the work is done pixel by pixel in the worker. */
  filters(options: FilterOptions): this {
    return isIdentity(options) ? this : this.add({ op: 'filters', options });
  }
  /** Keep only the ellipse inside the picture; the rest is transparent. */
  ellipse(): this {
    return this.add({ op: 'ellipse' });
  }
  /** Scale down so the longest edge is at most `edge` pixels; smaller images are left alone. */
  limit(edge: number): this {
    return this.add({ op: 'limit', edge });
  }

  /** Pick a page of a multi-page TIFF (0-based). */
  page(index: number): this {
    this.pageIndex = index;
    return this;
  }

  async encode(
    format: OutputFormat,
    options: { quality?: number; background?: string; dpi?: number } = {},
  ): Promise<EncodeResult> {
    let target: EncodeFormat;
    let note: string | undefined;
    if (format === 'original') {
      ({ format: target, note } = resolveOriginal(await sniff(this.file)));
    } else {
      target = format;
    }
    // Normally warmed already; this covers a format picked while the page was still loading.
    if (target === 'avif' || target === 'webp') await loadCodec(`${target}-enc`);
    const { dpi, ...encodeOptions } = options;
    const r = await this.execute({ encode: { format: target, ...encodeOptions } });
    // JPG and PNG can carry the print resolution; the other formats cannot.
    const blob = dpi ? await withDpi(r.blob!, dpi) : r.blob!;
    return { blob, width: r.width, height: r.height, note };
  }

  /** The best quality whose file stays under `maxBytes` (at most 7 encodes, decoded once). */
  async fitTo(
    maxBytes: number,
    format: 'jpeg' | 'webp' | 'avif',
  ): Promise<EncodeResult & { quality: number; reached: boolean }> {
    if (format !== 'jpeg') await loadCodec(`${format}-enc`);
    const r = await this.execute({
      encode: { format },
      task: { kind: 'fit', maxBytes },
    });
    return {
      blob: r.blob!,
      width: r.width,
      height: r.height,
      quality: r.quality!,
      reached: !!r.reached,
    };
  }

  /** An optimized PNG. With `colors` the colors are reduced first, unless that would not make it smaller. */
  async optimizePng(colors?: number): Promise<EncodeResult> {
    await loadCodec('oxipng');
    const r = await this.execute({ encode: { format: 'png' }, task: { kind: 'png', colors } });
    return { blob: r.blob!, width: r.width, height: r.height, note: r.note };
  }

  /** Decoded RGBA pixels with the steps applied, for tools that write their own file format (PDF). */
  async rgba(): Promise<RawPixels> {
    const r = await this.execute({ encode: { format: 'png' }, raw: true });
    return r.raw!;
  }

  private async execute(extra: Pick<Job, 'encode' | 'raw' | 'task'>) {
    const job = { file: this.file, page: this.pageIndex, steps: this.steps, ...extra };
    const pool = getPool();
    if (!heicNeedsFallback) {
      try {
        return await pool.run(job, this.signal);
      } catch (err) {
        // Only a HEIC the browser could not decode continues below.
        if (!(err instanceof JobError && err.reason === 'decode-failed')) throw err;
        if ((await sniff(this.file)) !== 'heic') throw err;
      }
    }
    const { decodeHeic } = await import('../codecs/heic');
    const pixels = await decodeHeic(this.file, this.signal);
    heicNeedsFallback = true;
    return pool.run({ ...job, pixels }, this.signal);
  }
}

/** One pipeline per page: a multi-page TIFF gives several, everything else gives one. */
export async function pages(file: Blob, signal?: AbortSignal): Promise<Pipeline[]> {
  const count = (await sniff(file)) === 'tiff' ? await tiffPageCount(file) : 1;
  return Array.from({ length: count }, (_, i) => new Pipeline(file, signal).page(i));
}

export function image(file: Blob, signal?: AbortSignal): Pipeline {
  return new Pipeline(file, signal);
}
