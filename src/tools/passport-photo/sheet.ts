// Grid maths for the passport photo print sheet (the photo size comes from the chosen document). All lengths are millimeters until `px` turns them into pixels.
import { formatSize, INCH_IN_MM } from '#lib/core/units';

export interface Size {
  width: number;
  height: number;
}

export const SHEETS = [
  {
    id: '4x6',
    label: formatSize(4 * INCH_IN_MM, 6 * INCH_IN_MM),
    width: 4 * INCH_IN_MM,
    height: 6 * INCH_IN_MM,
  },
  {
    id: '5x7',
    label: formatSize(5 * INCH_IN_MM, 7 * INCH_IN_MM),
    width: 5 * INCH_IN_MM,
    height: 7 * INCH_IN_MM,
  },
  { id: 'a4', label: `A4: ${formatSize(210, 297)}`, width: 210, height: 297 },
  {
    id: 'letter',
    label: `Letter: ${formatSize(8.5 * INCH_IN_MM, 11 * INCH_IN_MM)}`,
    width: 8.5 * INCH_IN_MM,
    height: 11 * INCH_IN_MM,
  },
] as const;

/** How many photos of `size` fit along a length of `length`, with `gap` between neighbors. */
export function fitCount(length: number, size: number, gap: number): number {
  if (size <= 0 || length < size) return 0;
  // A small epsilon keeps a photo that fits exactly (for example 4 × 51 mm on 204 mm) in.
  return Math.floor((length + gap) / (size + gap) + 1e-9);
}

export interface Grid {
  columns: number;
  rows: number;
  count: number;
  /** The sheet, turned the way that fits more photos. */
  sheet: Size;
  turned: boolean;
  /** Top-left corner of the block of photos, centered on the sheet. */
  left: number;
  top: number;
}

/** The grid that fits the most photos; the sheet is turned when that gives more. */
export function layout(sheet: Size, photo: Size, gap: number): Grid {
  const upright = grid(sheet, photo, gap, false);
  const turned = grid({ width: sheet.height, height: sheet.width }, photo, gap, true);
  return turned.count > upright.count ? turned : upright;
}

function grid(sheet: Size, photo: Size, gap: number, turned: boolean): Grid {
  const columns = fitCount(sheet.width, photo.width, gap);
  const rows = fitCount(sheet.height, photo.height, gap);
  const blockW = columns ? columns * photo.width + (columns - 1) * gap : 0;
  const blockH = rows ? rows * photo.height + (rows - 1) * gap : 0;
  return {
    columns,
    rows,
    count: columns * rows,
    sheet,
    turned,
    left: (sheet.width - blockW) / 2,
    top: (sheet.height - blockH) / 2,
  };
}

/** What the gap costs: how many copies fit with no gap, and how many fit with this one. */
export function gapCost(sheet: Size, photo: Size, gap: number) {
  const free = layout(sheet, photo, 0).count;
  const actual = layout(sheet, photo, gap).count;
  return { free, actual, lost: free - actual };
}

export const mmToPx = (mm: number, dpi: number) => Math.round((mm / INCH_IN_MM) * dpi);

export interface Cell {
  x: number;
  y: number;
}

/** Top-left corners of every photo in pixels, each rounded on its own so the gaps stay even. */
export function cells(g: Grid, photo: Size, gap: number, dpi: number): Cell[] {
  const out: Cell[] = [];
  for (let r = 0; r < g.rows; r++) {
    for (let c = 0; c < g.columns; c++) {
      out.push({
        x: mmToPx(g.left + c * (photo.width + gap), dpi),
        y: mmToPx(g.top + r * (photo.height + gap), dpi),
      });
    }
  }
  return out;
}

export function valid(photo: Size, gap: number): boolean {
  return (
    photo.width >= 10 &&
    photo.height >= 10 &&
    photo.width <= 400 &&
    photo.height <= 400 &&
    gap >= 0 &&
    gap <= 50
  );
}

/** Everything the print sheet needs for one photo size, gap and resolution. */
export function sheetPlan(sheet: Size, photo: Size, gapMm: number, dpi: number) {
  const ok = valid(photo, gapMm);
  const grid = ok ? layout(sheet, photo, gapMm) : null;
  const px = grid ? { w: mmToPx(grid.sheet.width, dpi), h: mmToPx(grid.sheet.height, dpi) } : null;
  return {
    ok,
    grid,
    cost: ok ? gapCost(sheet, photo, gapMm) : null,
    px,
    tooBig: !!px && px.w * px.h > 40_000_000,
  };
}
