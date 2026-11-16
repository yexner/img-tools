import { withDpi } from '#lib/core/dpi';
import type { Rect } from '#lib/core/rect';
import type { OutputFormat } from '#lib/types';
import { cells, type Grid, type Size } from './sheet';

export interface SheetArt {
  picture?: ImageBitmap;
  rect: Rect | null;
  photo: Size;
  gapMm: number;
  cutLines: boolean;
}

/** The same drawing for the preview and the saved file; `scale` turns file pixels into canvas pixels. */
export function drawSheet(
  ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D,
  g: Grid,
  scale: number,
  pxPerMm: number,
  { picture, rect, photo, gapMm, cutLines }: SheetArt,
) {
  const w = Math.round(g.sheet.width * pxPerMm * scale);
  const h = Math.round(g.sheet.height * pxPerMm * scale);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  if (!picture || !rect) return;
  ctx.imageSmoothingQuality = 'high';
  const pw = Math.round(photo.width * pxPerMm * scale);
  const ph = Math.round(photo.height * pxPerMm * scale);
  for (const c of cells(g, photo, gapMm, pxPerMm * 25.4)) {
    ctx.drawImage(
      picture,
      rect.x,
      rect.y,
      rect.w,
      rect.h,
      Math.round(c.x * scale),
      Math.round(c.y * scale),
      pw,
      ph,
    );
  }
  if (!cutLines) return;
  ctx.strokeStyle = '#999999';
  ctx.lineWidth = Math.max(1, Math.round(0.25 * pxPerMm * scale));
  ctx.beginPath();
  const half = gapMm / 2;
  const x0 = g.left - half;
  const y0 = g.top - half;
  const x1 = g.left + g.columns * photo.width + (g.columns - 0.5) * gapMm;
  const y1 = g.top + g.rows * photo.height + (g.rows - 0.5) * gapMm;
  const at = (mm: number) => Math.round(mm * pxPerMm * scale) + 0.5;
  for (let c = 0; c <= g.columns; c++) {
    const x = at(g.left + c * (photo.width + gapMm) - half);
    ctx.moveTo(x, at(y0));
    ctx.lineTo(x, at(y1));
  }
  for (let r = 0; r <= g.rows; r++) {
    const y = at(g.top + r * (photo.height + gapMm) - half);
    ctx.moveTo(at(x0), y);
    ctx.lineTo(at(x1), y);
  }
  ctx.stroke();
}

/** The finished print sheet as a JPEG or PNG file tagged with its print resolution. */
export async function sheetBlob(
  g: Grid,
  px: { w: number; h: number },
  dpi: number,
  art: SheetArt,
  format: OutputFormat,
  quality: number,
) {
  const out = new OffscreenCanvas(px.w, px.h);
  drawSheet(out.getContext('2d')!, g, 1, dpi / 25.4, art);
  const png = format === 'png';
  return withDpi(
    await out.convertToBlob({
      type: png ? 'image/png' : 'image/jpeg',
      quality: png ? undefined : quality / 100,
    }),
    dpi,
  );
}
