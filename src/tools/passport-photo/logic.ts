import type { PassportDocument } from '#lib/data/passport-documents';

/** The parts of a document the guide lines need; a custom document has no source. */
type Shape = Pick<PassportDocument, 'head' | 'height'>;
import type { Rect } from '#lib/core/rect';

/** Where the guide lines sit in the picture, as picture pixels from the top. */
interface Guides {
  crown: number;
  /** Lowest chin that still gives the shortest allowed head, and the lowest that gives the longest. */
  chinMin: number;
  chinMax: number;
}

/**
 * Guide lines for the box: the crown line sits `crownFraction` of the way down the box, and the chin lines
 * are the allowed head height further down. Null when the document states no head height.
 */
export function guides(box: Rect, doc: Shape, crownFraction: number): Guides | null {
  if (!doc.head) return null;
  const perMm = box.h / doc.height;
  const crown = box.y + box.h * crownFraction;
  return {
    crown,
    chinMin: crown + doc.head.min * perMm,
    chinMax: crown + doc.head.max * perMm,
  };
}

/** Highest crown position (as a fraction of the box) that keeps the longest allowed head inside the box. */
export function maxCrownFraction(doc: Shape): number {
  return doc.head ? Math.max(0, (doc.height - doc.head.max) / doc.height) : 0;
}

/** Width divided by height of the printed photo. */
export const aspectOf = (doc: Pick<PassportDocument, 'width' | 'height'>) => doc.width / doc.height;

/** The crop in whole pixels, never leaving the picture. */
export function cropBox(box: Rect, picture: { w: number; h: number }) {
  const w = Math.min(picture.w, Math.max(1, Math.round(box.w)));
  const h = Math.min(picture.h, Math.max(1, Math.round(box.h)));
  return {
    x: Math.min(picture.w - w, Math.max(0, Math.round(box.x))),
    y: Math.min(picture.h - h, Math.max(0, Math.round(box.y))),
    w,
    h,
  };
}

/** The size, head height and background a visitor typed for a document that is not listed. */
interface CustomInput {
  /** Centimeters. */
  width?: number;
  height?: number;
  headMin?: number;
  headMax?: number;
  background: string;
}

/** The custom document in millimeters, or null while the size is not usable. */
export function customDocument(i: CustomInput) {
  const { width, height } = i;
  if (!width || !height || width < 1 || height < 1 || width > 40 || height > 40) return null;
  const head =
    i.headMin && i.headMax && i.headMin < i.headMax && i.headMax < height
      ? { min: Math.round(i.headMin * 100) / 10, max: Math.round(i.headMax * 100) / 10 }
      : null;
  return {
    id: 'custom',
    label: 'Custom',
    width: Math.round(width * 100) / 10,
    height: Math.round(height * 100) / 10,
    head,
    background: i.background.trim() || null,
  };
}

/** A listed or custom document, as far as this tool needs it. */
export interface Doc {
  id: string;
  label: string;
  width: number;
  height: number;
  head: { min: number; max: number } | null;
  background: string | null;
  note?: string;
  source?: string;
  verified?: string;
}
