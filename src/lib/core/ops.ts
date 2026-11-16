import type { FilterOptions } from './filters';
import type { SingleOptions, TiledOptions } from './watermark';

/** Pixel-free description of the work a worker performs. Shared by the pipeline and the worker. */
export type Step =
  | { op: 'rotate'; deg: 90 | 180 | 270 }
  | { op: 'flip'; h: boolean; v: boolean }
  | { op: 'crop'; x: number; y: number; w: number; h: number }
  | { op: 'resize'; w: number; h: number; fit: 'contain' | 'cover' | 'stretch' }
  /** Scale down so the longest edge is at most `edge`; smaller images stay as they are. */
  | { op: 'limit'; edge: number }
  /** Multiply both sides by `factor`. */
  | { op: 'scale'; factor: number }
  /** Exact size. With only one side given, the other follows the picture's proportions. */
  | { op: 'size'; w?: number; h?: number }
  /** Grow the picture outward; `color` fills the new area, or leave it transparent when null. */
  | { op: 'pad'; top: number; right: number; bottom: number; left: number; color: string | null }
  /** Draw a watermark, as a share of the picture's width (see `core/watermark.ts`). */
  | { op: 'watermark'; mark: ImageBitmap; single: SingleOptions }
  | { op: 'watermark'; mark: ImageBitmap; tiled: TiledOptions }
  /** Look, brightness, contrast, saturation, fade and grain (see `core/filters.ts`). */
  | { op: 'filters'; options: FilterOptions }
  /** Keep only the ellipse that fills the picture; the rest becomes transparent. */
  | { op: 'ellipse' }
  /** Blur, pixelate or paint over parts of the picture. `strength` is 1 to 100; `color` is `#rrggbb` for `fill`. */
  | {
      op: 'regions';
      style: 'blur' | 'pixelate' | 'fill';
      color?: string;
      /** `oval`: only the ellipse inscribed in each region is changed. Default `rect`. */
      shape?: 'rect' | 'oval';
      regions: { x: number; y: number; w: number; h: number; strength: number }[];
    };

export type EncodeFormat = 'jpeg' | 'png' | 'webp' | 'avif';

export interface EncodeOptions {
  format: EncodeFormat;
  /** 1 to 100. Ignored for PNG. */
  quality?: number;
  /** Fill color for transparent areas. JPG always gets one (white by default, P12). */
  background?: string;
}

/** Decoded RGBA pixels, used when the decoder (libheif) ran outside the pool. */
export interface RawPixels {
  data: ArrayBuffer;
  width: number;
  height: number;
}

/** Work other than "encode once". */
type Task =
  /** Find the best quality that fits under `maxBytes` (uses `encode.format`). */
  | { kind: 'fit'; maxBytes: number }
  /** Optimized PNG, keeping at most `colors` colors when given. */
  | { kind: 'png'; colors?: number };

export interface Job {
  id: number;
  /** The file to decode; ignored when `pixels` is set. */
  file: Blob;
  pixels?: RawPixels;
  /** Page of a multi-page TIFF (0-based). */
  page?: number;
  steps: Step[];
  /** Not needed when `raw` is set. */
  encode: EncodeOptions;
  /** Return decoded RGBA pixels instead of an encoded file (for tools that build their own format). */
  raw?: boolean;
  task?: Task;
}

/**
 * Tells a worker to load a codec ahead of time, so it works even if the network drops later. The first worker fetches and compiles the WASM and
 * sends the compiled `module` back; the pool hands it to the other workers and to any respawned worker.
 */
export interface InitMessage {
  cmd: 'init';
  codec: 'avif-enc' | 'webp-enc' | 'oxipng' | 'tiff';
  module?: WebAssembly.Module;
}

export type Reply =
  | {
      id: number;
      ok: true;
      blob?: Blob;
      raw?: RawPixels;
      width: number;
      height: number;
      /** `fit`: the quality that was used, and whether the target size was reached. */
      quality?: number;
      reached?: boolean;
      note?: string;
    }
  | { id: number; ok: false; reason: string; message: string }
  | { cmd: 'init'; codec: string; ok: boolean; module?: WebAssembly.Module };
