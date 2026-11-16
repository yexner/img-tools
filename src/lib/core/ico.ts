// Writing .ico files. Each size inside is a PNG, which every current browser and Windows reads.

interface IcoImage {
  /** 1 to 256. */
  size: number;
  /** The PNG file for this size. */
  png: Uint8Array;
}

/** An icon file holding the given square PNGs, smallest first. */
export function buildIco(images: IcoImage[]): Uint8Array {
  const sorted = [...images].sort((a, b) => a.size - b.size);
  const head = 6 + 16 * sorted.length;
  const out = new Uint8Array(head + sorted.reduce((n, i) => n + i.png.length, 0));
  const v = new DataView(out.buffer);
  v.setUint16(0, 0, true); // reserved
  v.setUint16(2, 1, true); // type: icon
  v.setUint16(4, sorted.length, true);
  let offset = head;
  sorted.forEach((img, i) => {
    const at = 6 + i * 16;
    out[at] = img.size >= 256 ? 0 : img.size; // 0 means 256
    out[at + 1] = img.size >= 256 ? 0 : img.size;
    out[at + 2] = 0; // colors in the palette: none
    out[at + 3] = 0;
    v.setUint16(at + 4, 1, true); // color planes
    v.setUint16(at + 6, 32, true); // bits per pixel
    v.setUint32(at + 8, img.png.length, true);
    v.setUint32(at + 12, offset, true);
    out.set(img.png, offset);
    offset += img.png.length;
  });
  return out;
}

/** The entries of an icon file: size and the PNG bytes of each. Used by tests and to check output. */
export function readIco(bytes: Uint8Array): IcoImage[] {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (v.getUint16(2, true) !== 1) throw new Error('Not an icon file.');
  const count = v.getUint16(4, true);
  return Array.from({ length: count }, (_, i) => {
    const at = 6 + i * 16;
    const size = bytes[at] || 256;
    const length = v.getUint32(at + 8, true);
    const offset = v.getUint32(at + 12, true);
    return { size, png: bytes.subarray(offset, offset + length) };
  });
}
