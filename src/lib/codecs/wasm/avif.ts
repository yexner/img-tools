// Single-thread AVIF encoder: threads need COOP/COEP headers, which GitHub Pages cannot send.
// jsquash's own init() would pick the threaded build, so we drive the single-thread module ourselves.
import { defaultOptions } from '@jsquash/avif/meta.js';
import { initEmscriptenModule } from '@jsquash/avif/utils.js';
import wasmUrl from '@jsquash/avif/codec/enc/avif_enc.wasm?url';
import { compileWasm } from './compile';
import factory from '@jsquash/avif/codec/enc/avif_enc.js';

interface AvifModule {
  encode(data: Uint8Array, width: number, height: number, options: object): Uint8Array | null;
}

let module: Promise<AvifModule> | undefined;

/** Starts the encoder. Without a compiled module the WASM is downloaded and compiled first; the module is returned. */
export async function initAvif(compiled?: WebAssembly.Module): Promise<WebAssembly.Module> {
  const wasm = compiled ?? (await compileWasm(wasmUrl));
  module = initEmscriptenModule(factory, wasm) as Promise<AvifModule>;
  await module;
  return wasm;
}

export const avifReady = () => module !== undefined;

export async function encodeAvif(image: ImageData, quality: number): Promise<Blob> {
  if (!module) throw new Error('AVIF encoder is not loaded.');
  const m = await module;
  // speed 8 keeps large photos usable on one thread; quality maps straight onto the encoder's scale.
  const out = m.encode(new Uint8Array(image.data.buffer), image.width, image.height, {
    ...defaultOptions,
    quality,
    speed: 8,
  });
  if (!out) throw new Error('The AVIF encoder failed.');
  return new Blob([out.buffer as ArrayBuffer], { type: 'image/avif' });
}
