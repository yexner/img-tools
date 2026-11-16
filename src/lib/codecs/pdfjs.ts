// pdf.js for PDF to image. This version no longer uses eval; it runs with a locally shipped worker, character maps,
// standard fonts, color profiles and WASM decoders, so it works under our CSP and without a network.
import { asset } from '$app/paths';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import * as pdfjs from 'pdfjs-dist';

const absolute = (path: string) => new URL(path, document.baseURI).href;
const folder = (name: string) => absolute((asset as (p: string) => string)(`pdfjs/${name}/`));

let ready: Promise<typeof pdfjs> | undefined;

/** Start the pdf.js worker and keep it, so a later network loss does not matter. */
export function loadPdfjs(): Promise<typeof pdfjs> {
  ready ??= (async () => {
    pdfjs.GlobalWorkerOptions.workerPort = new Worker(absolute(workerUrl), { type: 'module' });
    return pdfjs;
  })();
  return ready;
}

export async function openPdf(
  data: Uint8Array,
  onPassword: (retry: boolean) => Promise<string | null>,
) {
  const lib = await loadPdfjs();
  const task = lib.getDocument({
    data,
    cMapUrl: folder('cmaps'),
    cMapPacked: true,
    standardFontDataUrl: folder('standard_fonts'),
    iccUrl: folder('iccs'),
    wasmUrl: folder('wasm'),
  });
  task.onPassword = async (update: (password: string) => void, reason: number) => {
    const password = await onPassword(reason === lib.PasswordResponses.INCORRECT_PASSWORD);
    if (password === null) void task.destroy();
    else update(password);
  };
  return { task, pdf: await task.promise, lib };
}
