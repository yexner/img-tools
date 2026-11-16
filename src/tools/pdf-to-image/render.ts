import { JobError } from '#lib/core';
import { canvasToBlob } from '#lib/core/bitmap';
import type { Output, RunContext } from '#lib/types';
import { LARGE_PIXELS, pageSuffix, planPage } from './logic';

interface RenderOptions {
  format: 'jpeg' | 'png';
  /** 1 to 100; used for JPG only. */
  quality: number;
  dpi: number;
}

/** Largest canvas we try to draw: phones run out of memory far sooner than computers. */
const limit = () => (matchMedia('(pointer: coarse)').matches ? 16_000_000 : 100_000_000);

const toBlob = (canvas: HTMLCanvasElement, type: string, quality?: number) =>
  canvasToBlob(canvas, type, quality).catch(() => {
    throw new JobError('out-of-memory', 'A page was too large to draw.');
  });

export async function renderPdf(
  file: File,
  options: RenderOptions,
  ctx: RunContext,
): Promise<Output[]> {
  // pdf.js is a big chunk of its own, so it loads here and not with the tool page's code.
  const { openPdf } = await import('#lib/codecs/pdfjs');
  let attempts = 0;
  let gaveUp = '';
  let opened;
  try {
    opened = await openPdf(new Uint8Array(await file.arrayBuffer()), async (wrong) => {
      if (wrong && ++attempts >= 3) {
        gaveUp = 'That password is not correct.';
        return null;
      }
      const password = await ctx.ask({
        label: wrong ? 'That password is not correct. Try again.' : `Password for ${file.name}`,
        secret: true,
      });
      if (password === null) gaveUp = 'No password was entered, so this PDF was not opened.';
      return password;
    });
  } catch (err) {
    if (gaveUp) throw new JobError('wrong-password', gaveUp);
    const name = (err as { name?: string }).name;
    if (name === 'PasswordException')
      throw new JobError('wrong-password', 'That password is not correct.');
    throw new JobError('decode-failed', 'This file could not be read as a PDF.');
  }
  const { pdf, task } = opened;
  const stop = () => void task.destroy();
  ctx.signal.addEventListener('abort', stop, { once: true });
  try {
    const total = pdf.numPages;
    const sizes = [];
    for (let n = 1; n <= total; n++) {
      const v = (await pdf.getPage(n)).getViewport({ scale: 1 });
      sizes.push(planPage(v.width, v.height, options.dpi, limit()));
    }
    const biggest = sizes.reduce((a, b) => (b.pixels > a.pixels ? b : a));
    if (biggest.reduced || biggest.pixels > LARGE_PIXELS) {
      const mp = Math.round(biggest.pixels / 1e6);
      const ok = await ctx.confirm(
        biggest.reduced
          ? `This PDF has very large pages. At ${options.dpi} DPI they would not fit in memory, so they will be rendered at ${biggest.dpi} DPI instead. Continue?`
          : `This PDF has very large pages (about ${mp} megapixels each at ${options.dpi} DPI). Rendering may be slow and use a lot of memory. Continue?`,
      );
      if (!ok) throw new JobError('cancelled', 'Canceled.');
    }

    const outputs: Output[] = [];
    for (let n = 1; n <= total; n++) {
      if (ctx.signal.aborted) throw new JobError('cancelled', 'Canceled.');
      const page = await pdf.getPage(n);
      const viewport = page.getViewport({ scale: sizes[n - 1].scale });
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(viewport.width));
      canvas.height = Math.max(1, Math.round(viewport.height));
      const context = canvas.getContext('2d');
      if (!context) throw new JobError('out-of-memory', 'A page was too large to draw.');
      await page.render({
        canvasContext: context,
        canvas,
        viewport,
        background: 'rgb(255, 255, 255)',
      }).promise;
      const blob =
        options.format === 'jpeg'
          ? await toBlob(canvas, 'image/jpeg', options.quality / 100)
          : await toBlob(canvas, 'image/png');
      canvas.width = canvas.height = 0; // release the memory right away
      page.cleanup();
      outputs.push({
        blob,
        suffix: total > 1 ? pageSuffix(n, total) : undefined,
        note: sizes[n - 1].reduced
          ? `Rendered at ${sizes[n - 1].dpi} DPI to fit in memory.`
          : undefined,
      });
      ctx.progress(n / total);
    }
    return outputs;
  } catch (err) {
    if (ctx.signal.aborted) throw new JobError('cancelled', 'Canceled.');
    throw err;
  } finally {
    ctx.signal.removeEventListener('abort', stop);
    void task.destroy();
  }
}
