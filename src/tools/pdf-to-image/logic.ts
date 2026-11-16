// Pure helpers for PDF to image, kept apart from pdf.js so they can be unit-tested.

/** PDF page sizes are in points: 72 per inch. */
const POINTS_PER_INCH = 72;

/** Pages above this size ask before rendering. */
export const LARGE_PIXELS = 25_000_000;

export interface Plan {
  /** Scale applied to the page size in points. */
  scale: number;
  dpi: number;
  pixels: number;
  /** True when the requested resolution had to be lowered to fit `limit`. */
  reduced: boolean;
}

/** Render size for one page at `dpi`, lowered if the canvas would exceed `limit` pixels. */
export function planPage(widthPt: number, heightPt: number, dpi: number, limit: number): Plan {
  let scale = dpi / POINTS_PER_INCH;
  let pixels = widthPt * scale * (heightPt * scale);
  const reduced = pixels > limit;
  if (reduced) {
    scale *= Math.sqrt(limit / pixels);
    pixels = widthPt * scale * (heightPt * scale);
  }
  return { scale, dpi: Math.floor(scale * POINTS_PER_INCH), pixels: Math.round(pixels), reduced };
}

/** Page number padded to the width of the last page, so files sort correctly: `page-07` of 12. */
export function pageSuffix(page: number, total: number): string {
  return `page-${String(page).padStart(String(total).length, '0')}`;
}
