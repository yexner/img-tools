// WebP encoder for browsers whose canvas cannot write WebP (Safari). Chromium and Firefox use the native one.
import { defaultOptions } from '@jsquash/webp/meta.js';
import { initEmscriptenModule } from '@jsquash/webp/utils.js';
import wasmUrl from '@jsquash/webp/codec/enc/webp_enc_simd.wasm?url';
import { compileWasm } from './compile';
import factory from '@jsquash/webp/codec/enc/webp_enc_simd.js';

interface WebpModule {
  encode(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    options: object,
  ): Uint8Array | null;
}

let module: Promise<WebpModule> | undefined;

/** Starts the encoder. Without a compiled module the WASM is downloaded and compiled first; the module is returned. */
export async function initWebp(compiled?: WebAssembly.Module): Promise<WebAssembly.Module> {
  const wasm = compiled ?? (await compileWasm(wasmUrl));
  module = initEmscriptenModule(factory, wasm) as Promise<WebpModule>;
  await module;
  return wasm;
}

export const webpReady = () => module !== undefined;

export async function encodeWebp(image: ImageData, quality: number): Promise<Blob> {
  if (!module) throw new Error('WebP encoder is not loaded.');
  const m = await module;
  const out = m.encode(image.data, image.width, image.height, { ...defaultOptions, quality });
  if (!out) throw new Error('The WebP encoder failed.');
  return new Blob([out.buffer as ArrayBuffer], { type: 'image/webp' });
}
