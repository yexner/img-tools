// TIFF decoding for every page (browsers decode at most the first page, and only Safari does that).
import UTIF from 'utif2';

export function decodeTiff(
  buffer: ArrayBuffer,
  page: number,
): { data: Uint8ClampedArray<ArrayBuffer>; width: number; height: number } {
  const ifds = UTIF.decode(buffer);
  // Same rule as `fullPageOffsets`: skip reduced-resolution copies and masks (NewSubfileType bits 0 and 2).
  const pages = ifds.filter(
    (ifd) => (((ifd.t254 as unknown as number[] | undefined)?.[0] ?? 0) & 5) === 0,
  );
  const ifd = (pages.length ? pages : ifds)[page];
  if (!ifd) throw new Error('TIFF page not found.');
  UTIF.decodeImage(buffer, ifd);
  const rgba = UTIF.toRGBA8(ifd);
  return {
    data: new Uint8ClampedArray(rgba.buffer as ArrayBuffer),
    width: ifd.width,
    height: ifd.height,
  };
}
