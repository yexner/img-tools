import { image, splitName } from '#lib/core';
import { jpegInfo } from '#lib/core/jpeg';
import { buildPdf, deflate, splitRgba, type PdfPage } from '#lib/core/pdf';
import type { ComposeSource } from '#lib/types';

/** One PDF page for one image. A JPEG is embedded as it is; anything else is stored as lossless pixels. */
async function pageFor(file: File, signal: AbortSignal): Promise<PdfPage> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const info = jpegInfo(bytes);
  if (info && (info.components === 1 || info.components === 3)) {
    return {
      width: info.width,
      height: info.height,
      orientation: info.orientation,
      image: { kind: 'jpeg', data: bytes, components: info.components },
    };
  }
  const { data, width, height } = await image(file, signal).rgba();
  const { rgb, alpha } = splitRgba(new Uint8Array(data));
  return {
    width,
    height,
    image: { kind: 'raw', rgb: await deflate(rgb), alpha: alpha && (await deflate(alpha)) },
  };
}

export async function buildImagePdf(
  sources: ComposeSource[],
  ctx: { signal: AbortSignal; progress(fraction: number): void },
): Promise<Blob> {
  const pages: PdfPage[] = [];
  for (const [i, source] of sources.entries()) {
    pages.push(await pageFor(source.file, ctx.signal));
    ctx.progress((i + 1) / sources.length);
  }
  return new Blob([buildPdf(pages) as BlobPart], { type: 'application/pdf' });
}

/** A single image keeps its name; several become `images.pdf`. */
export function pdfName(sources: ComposeSource[]): string {
  return sources.length === 1 ? `${splitName(sources[0].file.name).stem}.pdf` : 'images.pdf';
}
