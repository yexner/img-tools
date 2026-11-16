// Color formats shared by the color tools.

const hex2 = (n: number) => Math.round(n).toString(16).padStart(2, '0');
export const toHex = ([r, g, b]: [number, number, number]) => `#${hex2(r)}${hex2(g)}${hex2(b)}`;

/** Red, green, blue (0 to 255) as hue (0 to 360), saturation and lightness (0 to 100). */
export function toHsl([r, g, b]: [number, number, number]): [number, number, number] {
  const R = r / 255;
  const G = g / 255;
  const B = b / 255;
  const max = Math.max(R, G, B);
  const min = Math.min(R, G, B);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return [0, 0, Math.round(l * 100)];
  const s = d / (1 - Math.abs(2 * l - 1));
  let h = max === R ? ((G - B) / d) % 6 : max === G ? (B - R) / d + 2 : (R - G) / d + 4;
  h = (h * 60 + 360) % 360;
  return [Math.round(h), Math.round(s * 100), Math.round(l * 100)];
}
