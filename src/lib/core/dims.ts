// Picture size and print resolution read straight from a file's header, without decoding it.
import type { InputKind } from '../types';
import { sniff } from './formats';
import { jpegInfo } from './jpeg';

export interface Size {
  width: number;
  height: number;
}

/** Resolution in dots per inch, as stored in the file. */
export interface Dpi {
  x: number;
  y: number;
}

const ascii = (b: Uint8Array, at: number, text: string) =>
  [...text].every((c, i) => b[at + i] === c.charCodeAt(0));

/** Displayed size of an image: for photos that means after their orientation has been applied. */
export function readSize(bytes: Uint8Array, kind: InputKind): Size | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  try {
    switch (kind) {
      case 'jpeg': {
        const info = jpegInfo(bytes);
        if (!info) return null;
        return info.orientation >= 5
          ? { width: info.height, height: info.width }
          : { width: info.width, height: info.height };
      }
      case 'png':
        return { width: view.getUint32(16), height: view.getUint32(20) };
      case 'gif':
        return { width: view.getUint16(6, true), height: view.getUint16(8, true) };
      case 'webp':
        return webpSize(bytes, view);
      case 'bmp': {
        const header = view.getUint32(14, true);
        if (header === 12)
          return { width: view.getUint16(18, true), height: view.getUint16(20, true) };
        return {
          width: Math.abs(view.getInt32(18, true)),
          height: Math.abs(view.getInt32(22, true)),
        };
      }
      case 'tiff':
        return tiffSize(view);
      case 'avif':
      case 'heic':
        return isobmffSize(bytes, view);
      case 'svg':
        return svgSize(new TextDecoder().decode(bytes.subarray(0, 4096)));
      default:
        return null;
    }
  } catch {
    return null; // a header that is cut short
  }
}

function webpSize(b: Uint8Array, view: DataView): Size | null {
  if (ascii(b, 12, 'VP8X')) {
    const w = (b[24] | (b[25] << 8) | (b[26] << 16)) + 1;
    const h = (b[27] | (b[28] << 8) | (b[29] << 16)) + 1;
    return { width: w, height: h };
  }
  if (ascii(b, 12, 'VP8L')) {
    const v = view.getUint32(21, true);
    return { width: (v & 0x3fff) + 1, height: ((v >> 14) & 0x3fff) + 1 };
  }
  if (ascii(b, 12, 'VP8 ')) {
    return { width: view.getUint16(26, true) & 0x3fff, height: view.getUint16(28, true) & 0x3fff };
  }
  return null;
}

/** Value of a numeric tag in the first TIFF directory. */
function tiffTag(view: DataView, wanted: number): number | undefined {
  const little = view.getUint16(0) === 0x4949;
  const ifd = view.getUint32(4, little);
  const count = view.getUint16(ifd, little);
  for (let i = 0; i < count; i++) {
    const entry = ifd + 2 + i * 12;
    if (view.getUint16(entry, little) !== wanted) continue;
    return view.getUint16(entry + 2, little) === 3
      ? view.getUint16(entry + 8, little)
      : view.getUint32(entry + 8, little);
  }
  return undefined;
}

function tiffSize(view: DataView): Size | null {
  const width = tiffTag(view, 256);
  const height = tiffTag(view, 257);
  return width && height ? { width, height } : null;
}

/** AVIF and HEIC: the largest `ispe` (image spatial extents) box, turned by `irot` when present. */
function isobmffSize(b: Uint8Array, view: DataView): Size | null {
  let best: Size | null = null;
  let turned = false;
  for (let i = 4; i + 16 <= b.length; i++) {
    if (ascii(b, i, 'ispe')) {
      const width = view.getUint32(i + 8);
      const height = view.getUint32(i + 12);
      if (!best || width * height > best.width * best.height) best = { width, height };
    } else if (ascii(b, i, 'irot')) {
      turned = (b[i + 4] & 3) % 2 === 1;
    }
  }
  return best && turned ? { width: best.height, height: best.width } : best;
}

function svgSize(text: string): Size | null {
  const tag = /<svg\b[^>]*>/i.exec(text)?.[0];
  if (!tag) return null;
  const attr = (name: string) =>
    new RegExp(`\\s${name}\\s*=\\s*["']([^"']+)["']`, 'i').exec(tag)?.[1];
  const px = (v?: string) => (v && /^\s*[\d.]+(px)?\s*$/.test(v) ? parseFloat(v) : undefined);
  const width = px(attr('width'));
  const height = px(attr('height'));
  if (width && height) return { width: Math.round(width), height: Math.round(height) };
  const box = attr('viewBox')
    ?.trim()
    .split(/[\s,]+/)
    .map(Number);
  if (box?.length === 4 && box[2] > 0 && box[3] > 0) {
    return { width: Math.round(box[2]), height: Math.round(box[3]) };
  }
  return null;
}

/** Print resolution stored in the file, or null when there is none (or it is only an aspect ratio). */
export function readDpi(bytes: Uint8Array, kind: InputKind): Dpi | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  try {
    switch (kind) {
      case 'jpeg':
        return jpegDpi(bytes, view);
      case 'png':
        return pngDpi(bytes, view);
      case 'bmp': {
        const x = view.getInt32(38, true);
        const y = view.getInt32(42, true);
        return x > 0 && y > 0 ? { x: round(x / 39.3701), y: round(y / 39.3701) } : null;
      }
      case 'tiff':
        return tiffDpi(view);
      default:
        return null;
    }
  } catch {
    return null;
  }
}

const round = (n: number) => Math.round(n * 100) / 100;

function jpegDpi(b: Uint8Array, view: DataView): Dpi | null {
  let fromExif: Dpi | null = null;
  let at = 2;
  while (at + 4 <= b.length && b[at] === 0xff) {
    const marker = b[at + 1];
    const length = view.getUint16(at + 2);
    if (marker === 0xe0 && ascii(b, at + 4, 'JFIF\0')) {
      const units = b[at + 11];
      const x = view.getUint16(at + 12);
      const y = view.getUint16(at + 14);
      if (units === 1 && x > 0 && y > 0) return { x, y };
      if (units === 2 && x > 0 && y > 0) return { x: round(x * 2.54), y: round(y * 2.54) };
    }
    if (marker === 0xe1 && ascii(b, at + 4, 'Exif\0\0')) {
      fromExif = exifDpi(new DataView(b.buffer, b.byteOffset + at + 10, length - 8));
    }
    if (marker === 0xda) break; // start of scan: no more headers
    at += 2 + length;
  }
  return fromExif;
}

function exifDpi(view: DataView): Dpi | null {
  const little = view.getUint16(0) === 0x4949;
  const ifd = view.getUint32(4, little);
  const count = view.getUint16(ifd, little);
  const rational = (entry: number) => {
    const at = view.getUint32(entry + 8, little);
    return view.getUint32(at, little) / (view.getUint32(at + 4, little) || 1);
  };
  let x = 0;
  let y = 0;
  let unit = 2;
  for (let i = 0; i < count; i++) {
    const entry = ifd + 2 + i * 12;
    const tag = view.getUint16(entry, little);
    if (tag === 282) x = rational(entry);
    if (tag === 283) y = rational(entry);
    if (tag === 296) unit = view.getUint16(entry + 8, little);
  }
  if (!x || !y || unit === 1) return null;
  const k = unit === 3 ? 2.54 : 1; // 3 = per centimeter
  return { x: round(x * k), y: round(y * k) };
}

function pngDpi(b: Uint8Array, view: DataView): Dpi | null {
  for (let at = 8; at + 12 <= b.length; at += 12 + view.getUint32(at)) {
    if (ascii(b, at + 4, 'pHYs')) {
      const x = view.getUint32(at + 8);
      const y = view.getUint32(at + 12);
      return b[at + 16] === 1 && x > 0 && y > 0
        ? { x: round(x * 0.0254), y: round(y * 0.0254) }
        : null;
    }
    if (ascii(b, at + 4, 'IDAT')) break; // pHYs always comes before the pixel data
  }
  return null;
}

function tiffDpi(view: DataView): Dpi | null {
  const little = view.getUint16(0) === 0x4949;
  const ifd = view.getUint32(4, little);
  const count = view.getUint16(ifd, little);
  let x = 0;
  let y = 0;
  let unit = 2;
  for (let i = 0; i < count; i++) {
    const entry = ifd + 2 + i * 12;
    const tag = view.getUint16(entry, little);
    const rational = () => {
      const at = view.getUint32(entry + 8, little);
      return view.getUint32(at, little) / (view.getUint32(at + 4, little) || 1);
    };
    if (tag === 282) x = rational();
    if (tag === 283) y = rational();
    if (tag === 296) unit = view.getUint16(entry + 8, little);
  }
  if (!x || !y || unit === 1) return null;
  const k = unit === 3 ? 2.54 : 1;
  return { x: round(x * k), y: round(y * k) };
}

/** Displayed size of a file, from its header (about the first 128 KB). Null when it cannot be read. */
export async function readSizeOf(file: Blob): Promise<Size | null> {
  const kind = await sniff(file);
  if (!kind) return null;
  return readSize(new Uint8Array(await file.slice(0, 131072).arrayBuffer()), kind);
}
