import { formatSize, INCH_IN_MM, toPx, type Unit } from '#lib/core/units';

export type Fit = 'within' | 'fill' | 'stretch';

export interface Preset {
  id: string;
  label: string;
  width: number;
  height: number;
  unit: Unit;
}

/** Portrait sizes; the box is turned to match each photo, so landscape photos fit the wide way. */
export const PRESETS: Preset[] = [
  { id: '4x6', label: '', width: 4, height: 6, unit: 'in' },
  { id: '5x7', label: '', width: 5, height: 7, unit: 'in' },
  { id: 'a4', label: 'A4: ', width: 210, height: 297, unit: 'mm' },
  { id: 'letter', label: 'Letter: ', width: 8.5, height: 11, unit: 'in' },
].map((p) => {
  const mm = p.unit === 'in' ? INCH_IN_MM : 1;
  return { ...p, label: p.label + formatSize(p.width * mm, p.height * mm), unit: p.unit as Unit };
});

export interface Options {
  width: number;
  height: number;
  unit: Unit;
  dpi: number;
  fit: Fit;
}

export interface Size {
  width: number;
  height: number;
}

/** The print box in pixels, turned to match the photo's orientation. */
export function boxFor(photo: Size | null, o: Options): Size {
  let w = toPx(o.width, o.unit, o.dpi);
  let h = toPx(o.height, o.unit, o.dpi);
  if (photo && photo.width !== photo.height && w !== h && photo.width > photo.height !== w > h) {
    [w, h] = [h, w];
  }
  return { width: w, height: h };
}

/** Pixel size of the result for one photo. */
export function resultSize(photo: Size | null, o: Options): Size {
  const box = boxFor(photo, o);
  if (o.fit !== 'within' || !photo) return box;
  const k = Math.min(box.width / photo.width, box.height / photo.height);
  return {
    width: Math.max(1, Math.round(photo.width * k)),
    height: Math.max(1, Math.round(photo.height * k)),
  };
}

export const valid = (o: Options) => o.width > 0 && o.height > 0 && o.dpi > 0;
