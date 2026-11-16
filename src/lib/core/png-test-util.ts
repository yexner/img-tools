// Test helper: inserts a tEXt chunk into a PNG.
import { crc32 } from './png';

export function addText(png: Uint8Array, keyword: string, text: string): Uint8Array {
  const body = new TextEncoder().encode(`${keyword}\0${text}`);
  const chunk = new Uint8Array(12 + body.length);
  const view = new DataView(chunk.buffer);
  view.setUint32(0, body.length);
  chunk.set(new TextEncoder().encode('tEXt'), 4);
  chunk.set(body, 8);
  view.setUint32(8 + body.length, crc32(chunk.subarray(4, 8 + body.length)));
  const end = png.length - 12;
  const out = new Uint8Array(png.length + chunk.length);
  out.set(png.subarray(0, end));
  out.set(chunk, end);
  out.set(png.subarray(end), end + chunk.length);
  return out;
}
