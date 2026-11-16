// Drawing a square icon at a given size from part of a picture, for the favicon and app icon tools.
import { fromRelative, toPixels, type RelRect } from './rect';
import { canvasOf, ctx2d, resample } from './steps';

/** The square part of a picture, in pixels, for a region given as fractions. */
export function squareOf(picture: { width: number; height: number }, region: RelRect | null) {
  const bounds = { w: picture.width, h: picture.height };
  const side = Math.min(bounds.w, bounds.h);
  const rect = region
    ? toPixels(fromRelative(region, bounds, 1), bounds)
    : {
        x: Math.floor((bounds.w - side) / 2),
        y: Math.floor((bounds.h - side) / 2),
        w: side,
        h: side,
      };
  return rect;
}

/**
 * One icon, `size` pixels square. Large reductions are done in halves so edges stay clean. With
 * `background`, transparent areas are filled with that color (iOS icons must be opaque).
 */
export async function renderIcon(
  picture: ImageBitmap,
  part: { x: number; y: number; w: number; h: number },
  size: number,
  background?: string,
): Promise<Blob> {
  const cut = canvasOf(part.w, part.h);
  ctx2d(cut).drawImage(picture, part.x, part.y, part.w, part.h, 0, 0, part.w, part.h);
  let icon = resample(cut, size, size);
  if (background) {
    const flat = canvasOf(size, size);
    const g = ctx2d(flat);
    g.fillStyle = background;
    g.fillRect(0, 0, size, size);
    g.drawImage(icon, 0, 0);
    icon = flat;
  }
  return icon.convertToBlob({ type: 'image/png' });
}

/** Whether any pixel of the part is see-through. Checked on a small copy, which is enough to notice it. */
export function hasAlpha(
  picture: ImageBitmap,
  part: { x: number; y: number; w: number; h: number },
): boolean {
  const side = 64;
  const canvas = canvasOf(side, side);
  const ctx = ctx2d(canvas);
  ctx.drawImage(picture, part.x, part.y, part.w, part.h, 0, 0, side, side);
  const px = ctx.getImageData(0, 0, side, side).data;
  for (let i = 3; i < px.length; i += 4) if (px[i] < 255) return true;
  return false;
}
