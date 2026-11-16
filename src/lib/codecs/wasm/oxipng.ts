// Lossless PNG optimizer. The single-thread build is driven directly: jsquash's init() would pick the
// threaded one, which needs cross-origin isolation that GitHub Pages cannot provide.
import wasmUrl from '@jsquash/oxipng/codec/pkg/squoosh_oxipng_bg.wasm?url';
import { applyPalette, quantize } from 'gifenc';
import { initSync, optimise, optimise_raw } from '@jsquash/oxipng/codec/pkg/squoosh_oxipng.js';
import { compileWasm } from './compile';

let ready = false;

export async function initOxipng(compiled?: WebAssembly.Module): Promise<WebAssembly.Module> {
  const wasm = compiled ?? (await compileWasm(wasmUrl));
  initSync(wasm);
  ready = true;
  return wasm;
}

export const oxipngReady = () => ready;

/** Level 2 is a good balance of speed and size; `interlace` stays off because it makes files larger. */
const LEVEL = 2;

/** Optimize an existing PNG file without changing a single pixel. */
export function optimizePng(bytes: Uint8Array): Uint8Array {
  return optimise(bytes, LEVEL, false, true);
}

/** Write raw RGBA pixels as an optimized PNG; images with 256 colors or fewer become indexed. */
export function optimizeRaw(rgba: Uint8ClampedArray, width: number, height: number): Uint8Array {
  return optimise_raw(rgba, width, height, LEVEL, false, true);
}

/**
 * The picture redrawn with at most `colors` colors, as RGBA. gifenc is imported here, not in the worker,
 * so it is part of the chunk that is loaded when the page opens and works offline.
 */
export function reduceColors(rgba: Uint8ClampedArray, colors: number): Uint8ClampedArray {
  const opaque = rgba.every((v, i) => i % 4 !== 3 || v === 255);
  const format = opaque ? 'rgb565' : 'rgba4444';
  const palette = quantize(rgba, colors, { format });
  const index = applyPalette(rgba, palette, format);
  const out = new Uint8ClampedArray(index.length * 4);
  index.forEach((n, i) =>
    out.set(palette[n].length === 4 ? palette[n] : [...palette[n], 255], i * 4),
  );
  return out;
}
