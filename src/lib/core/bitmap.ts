import { readSizeOf } from './dims';
import { sniff } from './formats';
import { image } from './pipeline';

/** A picture ready to draw, upright. Formats the browser cannot decode (HEIC, TIFF) go through the pipeline. */
export async function loadPicture(file: Blob, longestSide?: number): Promise<ImageBitmap> {
  if ((await sniff(file)) === 'svg') return loadSvg(file, longestSide);
  try {
    const bitmap = await createImageBitmap(file);
    if (!longestSide || Math.max(bitmap.width, bitmap.height) <= longestSide) return bitmap;
    const k = longestSide / Math.max(bitmap.width, bitmap.height);
    const small = await createImageBitmap(bitmap, {
      resizeWidth: Math.round(bitmap.width * k),
      resizeHeight: Math.round(bitmap.height * k),
      resizeQuality: 'high',
    });
    bitmap.close();
    return small;
  } catch {
    const { data, width, height } = await image(file).rgba();
    return createImageBitmap(new ImageData(new Uint8ClampedArray(data), width, height));
  }
}

/**
 * An SVG drawn at its own size (or scaled to `longestSide`), through an image element. Scripts inside an
 * SVG do not run when it is used as a picture.
 */
async function loadSvg(file: Blob, longestSide?: number): Promise<ImageBitmap> {
  const own = (await readSizeOf(file)) ?? { width: 300, height: 150 };
  const k = longestSide ? longestSide / Math.max(own.width, own.height) : 1;
  const width = Math.max(1, Math.round(own.width * k));
  const height = Math.max(1, Math.round(own.height * k));
  const url = URL.createObjectURL(file);
  try {
    const img = new Image(width, height);
    img.src = url;
    await img.decode();
    const canvas = new OffscreenCanvas(width, height);
    canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
    return await createImageBitmap(canvas);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** `canvas.toBlob` as a promise; rejects when the browser cannot make the image. */
export const canvasToBlob = (canvas: HTMLCanvasElement, type = 'image/png', quality?: number) =>
  new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('The image could not be made.'))),
      type,
      quality,
    ),
  );
