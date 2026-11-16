// Builds small uncompressed RGB TIFF files for tests, so no binary fixture is needed for multi-page cases.
export interface TiffPage {
  width: number;
  height: number;
  /** RGB color of the page. */
  rgb: [number, number, number];
  /** Marks a reduced-resolution copy (NewSubfileType 1) that must not count as a page. */
  reduced?: boolean;
}

export function buildTiff(pages: TiffPage[]): Uint8Array {
  const chunks: number[] = [];
  const u16 = (v: number) => chunks.push(v & 255, (v >> 8) & 255);
  const u32 = (v: number) =>
    chunks.push(v & 255, (v >> 8) & 255, (v >> 16) & 255, (v >>> 24) & 255);
  const at = () => chunks.length;
  chunks.push(0x49, 0x49, 42, 0); // "II", 42
  u32(0); // first IFD offset, patched below
  const ifdOffsets: number[] = [];
  const nextSlots: number[] = [];
  for (const page of pages) {
    // Pixel strip, then the bits-per-sample array, then the directory.
    const stripAt = at();
    for (let i = 0; i < page.width * page.height; i++) chunks.push(...page.rgb);
    const bitsAt = at();
    u16(8);
    u16(8);
    u16(8);
    if (at() % 2) chunks.push(0);
    ifdOffsets.push(at());
    const entries: [number, number, number, number][] = [
      [254, 4, 1, page.reduced ? 1 : 0],
      [256, 4, 1, page.width],
      [257, 4, 1, page.height],
      [258, 3, 3, bitsAt],
      [259, 3, 1, 1],
      [262, 3, 1, 2],
      [273, 4, 1, stripAt],
      [277, 3, 1, 3],
      [278, 4, 1, page.height],
      [279, 4, 1, page.width * page.height * 3],
    ];
    u16(entries.length);
    for (const [tag, type, count, value] of entries) {
      u16(tag);
      u16(type);
      u32(count);
      if (type === 3 && count === 1) {
        u16(value);
        u16(0);
      } else u32(value);
    }
    nextSlots.push(at());
    u32(0);
  }
  const patch = (pos: number, v: number) => {
    chunks[pos] = v & 255;
    chunks[pos + 1] = (v >> 8) & 255;
    chunks[pos + 2] = (v >> 16) & 255;
    chunks[pos + 3] = (v >>> 24) & 255;
  };
  patch(4, ifdOffsets[0]);
  nextSlots.forEach((slot, i) => patch(slot, ifdOffsets[i + 1] ?? 0));
  return new Uint8Array(chunks);
}
