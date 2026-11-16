// Reads what a PDF writer needs from a JPEG without decoding it: size, color components and the EXIF orientation.

interface JpegInfo {
  width: number;
  height: number;
  /** 1 = gray, 3 = color, 4 = CMYK. */
  components: number;
  /** EXIF orientation 1 to 8; 1 when absent. */
  orientation: number;
}

export function jpegInfo(bytes: Uint8Array): JpegInfo | null {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let orientation = 1;
  let at = 2;
  while (at + 4 <= bytes.length) {
    if (bytes[at] !== 0xff) return null;
    const marker = bytes[at + 1];
    if (marker === 0xff) {
      at++; // padding byte
      continue;
    }
    const length = view.getUint16(at + 2);
    if (marker === 0xe1 && length >= 16 && ascii(bytes, at + 4, 'Exif\0\0')) {
      orientation = exifOrientation(view, at + 10, at + 2 + length) ?? orientation;
    }
    // Start-of-frame markers, except DHT (C4), JPG (C8) and DAC (CC).
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      if (at + 10 > bytes.length) return null;
      return {
        height: view.getUint16(at + 5),
        width: view.getUint16(at + 7),
        components: bytes[at + 9],
        orientation,
      };
    }
    at += 2 + length;
  }
  return null;
}

const ascii = (b: Uint8Array, at: number, text: string) =>
  [...text].every((c, i) => b[at + i] === c.charCodeAt(0));

/** Orientation tag from the TIFF block inside an Exif segment (`start` is the TIFF header, `end` the segment end). */
function exifOrientation(view: DataView, start: number, end: number): number | undefined {
  if (start + 8 > end) return undefined;
  const little = view.getUint16(start) === 0x4949;
  const ifd = start + view.getUint32(start + 4, little);
  if (ifd + 2 > end) return undefined;
  const count = view.getUint16(ifd, little);
  for (let i = 0; i < count && ifd + 2 + i * 12 + 12 <= end; i++) {
    const entry = ifd + 2 + i * 12;
    if (view.getUint16(entry, little) === 0x0112) {
      const value = view.getUint16(entry + 8, little);
      return value >= 1 && value <= 8 ? value : undefined;
    }
  }
  return undefined;
}
