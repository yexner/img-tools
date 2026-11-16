import { decode } from 'blurhash';

/** Put an RGBA picture on white, so transparent areas are not read as black. BlurHash has no alpha. */
export function onWhite(rgba: Uint8ClampedArray): Uint8ClampedArray {
  const out = new Uint8ClampedArray(rgba.length);
  for (let i = 0; i < rgba.length; i += 4) {
    const a = rgba[i + 3] / 255;
    out[i] = rgba[i] * a + 255 * (1 - a);
    out[i + 1] = rgba[i + 1] * a + 255 * (1 - a);
    out[i + 2] = rgba[i + 2] * a + 255 * (1 - a);
    out[i + 3] = 255;
  }
  return out;
}

const hex = (n: number) => Math.round(n).toString(16).padStart(2, '0');

/**
 * The placeholder as CSS: one horizontal gradient per row of a small decoded picture, stacked. It is a
 * rough version of the BlurHash that needs no JavaScript to show.
 */
export function cssGradient(
  hash: string,
  width: number,
  height: number,
  cols = 6,
  rows = 6,
): string {
  const px = decode(hash, cols, rows);
  const layers: string[] = [];
  for (let r = 0; r < rows; r++) {
    const stops = Array.from({ length: cols }, (_, c) => {
      const i = (r * cols + c) * 4;
      return `#${hex(px[i])}${hex(px[i + 1])}${hex(px[i + 2])}`;
    });
    const y = rows === 1 ? 0 : (r / (rows - 1)) * 100;
    layers.push(
      `linear-gradient(to right, ${stops.join(', ')}) 0 ${y.toFixed(1)}% / 100% ${(100 / rows).toFixed(2)}% no-repeat`,
    );
  }
  void width;
  void height;
  return `background: ${layers.join(',\n  ')};`;
}

/** Number of detail steps in a hash, read from its first character. */
export function components(hash: string): { x: number; y: number } {
  const chars =
    '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz#$%*+,-.:;=?@[]^_{|}~';
  const size = chars.indexOf(hash[0]);
  return { x: (size % 9) + 1, y: Math.floor(size / 9) + 1 };
}
