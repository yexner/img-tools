import { loadPicture } from '#lib/core/bitmap';
import type { ComposeSource } from '#lib/types';
import { className, pack, toCss, type Packing, type Sprite } from './logic';

interface Made {
  bitmaps: ImageBitmap[];
  packed: Packing;
  sprites: Sprite[];
  css: string;
}

/** Read the pictures and work out the layout and the CSS. The caller must close the bitmaps. */
export async function layoutOf(list: ComposeSource[], gap: number, retina: boolean): Promise<Made> {
  const bitmaps = await Promise.all(list.map((s) => loadPicture(s.file)));
  const boxes = bitmaps.map((b) => ({ width: b.width, height: b.height }));
  const packed = pack(boxes, gap);
  const taken = new Set<string>();
  const sprites: Sprite[] = list.map((s, i) => ({
    name: className(s.file.name, taken),
    ...packed.places[i],
    ...boxes[i],
  }));
  return { bitmaps, packed, sprites, css: toCss(sprites, packed, retina) };
}

/** The sheet as a PNG, at `scale` times the layout size. */
export async function drawSheet(made: Made, scale: number): Promise<Blob> {
  const { bitmaps, packed } = made;
  const canvas = new OffscreenCanvas(
    Math.max(1, packed.width * scale),
    Math.max(1, packed.height * scale),
  );
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  bitmaps.forEach((b, i) => {
    const p = packed.places[i];
    ctx.drawImage(b, p.x * scale, p.y * scale, b.width * scale, b.height * scale);
  });
  return canvas.convertToBlob({ type: 'image/png' });
}

export const closeAll = (made: Made) => made.bitmaps.forEach((b) => b.close());
