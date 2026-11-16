// PNG chunk handling: dropping metadata without touching the pixels.

/** Chunks that describe the picture itself; everything else (text, Exif, timestamps, private data) is removed. */
const KEEP = new Set([
  'IHDR',
  'PLTE',
  'IDAT',
  'IEND',
  'tRNS',
  'gAMA',
  'cHRM',
  'sRGB',
  'iCCP',
  'cICP',
  'pHYs',
]);

const SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** The PNG without its metadata chunks. Color information and the resolution stay. */
export function stripPng(bytes: Uint8Array): Uint8Array {
  if (bytes.length < 8 || SIGNATURE.some((b, i) => bytes[i] !== b)) return bytes;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const kept: Uint8Array[] = [bytes.subarray(0, 8)];
  let at = 8;
  while (at + 12 <= bytes.length) {
    const size = view.getUint32(at);
    const end = at + 12 + size;
    if (end > bytes.length) return bytes; // damaged: leave it alone
    const type = String.fromCharCode(...bytes.subarray(at + 4, at + 8));
    if (KEEP.has(type)) kept.push(bytes.subarray(at, end));
    at = end;
  }
  const out = new Uint8Array(kept.reduce((n, c) => n + c.length, 0));
  let pos = 0;
  for (const chunk of kept) {
    out.set(chunk, pos);
    pos += chunk.length;
  }
  return out;
}

/** Names of the chunks in a PNG, in order (for tests and for the metadata report). */
export function pngChunks(bytes: Uint8Array): string[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const names: string[] = [];
  for (let at = 8; at + 12 <= bytes.length; at += 12 + view.getUint32(at)) {
    names.push(String.fromCharCode(...bytes.subarray(at + 4, at + 8)));
  }
  return names;
}

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

/** CRC-32 as PNG chunks use it. */
export function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (const b of bytes) c = crcTable[(c ^ b) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** The PNG with its print resolution set to `dpi` (a `pHYs` chunk after IHDR; any old one is replaced). */
export function setPngDpi(bytes: Uint8Array, dpi: number): Uint8Array {
  if (bytes.length < 33 || SIGNATURE.some((b, i) => bytes[i] !== b)) return bytes;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const chunk = new Uint8Array(21);
  const out = new DataView(chunk.buffer);
  out.setUint32(0, 9);
  chunk.set([0x70, 0x48, 0x59, 0x73], 4); // "pHYs"
  const perMeter = Math.round(dpi / 0.0254);
  out.setUint32(8, perMeter);
  out.setUint32(12, perMeter);
  chunk[16] = 1; // unit: meter
  out.setUint32(17, crc32(chunk.subarray(4, 17)));
  const parts: Uint8Array[] = [bytes.subarray(0, 8)];
  for (let at = 8; at + 12 <= bytes.length;) {
    const end = at + 12 + view.getUint32(at);
    const type = String.fromCharCode(...bytes.subarray(at + 4, at + 8));
    if (type !== 'pHYs') parts.push(bytes.subarray(at, end));
    if (type === 'IHDR') parts.push(chunk);
    at = end;
  }
  const result = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let pos = 0;
  for (const p of parts) {
    result.set(p, pos);
    pos += p.length;
  }
  return result;
}
