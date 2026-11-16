// Minimal TIFF directory walk: counts the full-size pages of a file without decoding anything,
// so a multi-page TIFF can be split into one job per page (`pages()`).

/** Offsets of the image directories that are real pages (not thumbnails or masks). */
function fullPageOffsets(view: DataView): number[] {
  if (view.byteLength < 8) return [];
  const little = view.getUint16(0) === 0x4949;
  const u16 = (o: number) => view.getUint16(o, little);
  const u32 = (o: number) => view.getUint32(o, little);
  const offsets: number[] = [];
  const seen = new Set<number>();
  let at = u32(4);
  while (at > 0 && at + 2 <= view.byteLength && !seen.has(at)) {
    seen.add(at);
    const count = u16(at);
    if (at + 2 + count * 12 + 4 > view.byteLength) break;
    let subfile = 0;
    for (let i = 0; i < count; i++) {
      const entry = at + 2 + i * 12;
      if (u16(entry) === 254) subfile = u32(entry + 8); // NewSubfileType
    }
    // Bit 0 marks a reduced-resolution copy and bit 2 a transparency mask.
    if ((subfile & 5) === 0) offsets.push(at);
    at = u32(at + 2 + count * 12);
  }
  return offsets;
}

export async function tiffPageCount(file: Blob): Promise<number> {
  const view = new DataView(await file.arrayBuffer());
  return Math.max(1, fullPageOffsets(view).length);
}
