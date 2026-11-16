// Writing the print resolution into JPEG and PNG files, so print software sizes them correctly.
// WebP and AVIF cannot store it reliably, which is why print tools offer JPG and PNG only.
import { setPngDpi } from './png';

/** A JPEG whose JFIF header says `dpi` dots per inch. A JFIF header is added when there is none. */
export function setJpegDpi(bytes: Uint8Array, dpi: number): Uint8Array {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return bytes;
  const d = Math.min(65535, Math.max(1, Math.round(dpi)));
  const isJfif =
    bytes[2] === 0xff &&
    bytes[3] === 0xe0 &&
    String.fromCharCode(...bytes.subarray(6, 10)) === 'JFIF';
  if (isJfif) {
    const out = bytes.slice();
    out[13] = 1; // units: dots per inch
    out.set([d >> 8, d & 255, d >> 8, d & 255], 14);
    return out;
  }
  const jfif = new Uint8Array([
    0xff,
    0xe0,
    0x00,
    0x10,
    0x4a,
    0x46,
    0x49,
    0x46,
    0x00,
    0x01,
    0x02,
    0x01,
    d >> 8,
    d & 255,
    d >> 8,
    d & 255,
    0x00,
    0x00,
  ]);
  const out = new Uint8Array(bytes.length + jfif.length);
  out.set(bytes.subarray(0, 2));
  out.set(jfif, 2);
  out.set(bytes.subarray(2), 2 + jfif.length);
  return out;
}

/** The file with `dpi` stored in it, when its format can hold one; other formats come back unchanged. */
export async function withDpi(blob: Blob, dpi: number): Promise<Blob> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  if (blob.type === 'image/jpeg')
    return new Blob([setJpegDpi(bytes, dpi) as BlobPart], { type: blob.type });
  if (blob.type === 'image/png')
    return new Blob([setPngDpi(bytes, dpi) as BlobPart], { type: blob.type });
  return blob;
}
