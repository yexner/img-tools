import { applyPalette, quantize } from 'gifenc';
import { toHex, toHsl } from '#lib/core/color';

interface Swatch {
  hex: string;
  rgb: [number, number, number];
  hsl: [number, number, number];
  /** Share of the picture's opaque pixels, 0 to 100. */
  share: number;
}

export { toHex, toHsl };

/**
 * The dominant colors of a picture, most common first. Pixels that are mostly transparent are left out,
 * so a logo on a clear background gives the logo's colors.
 */
export function extractPalette(rgba: Uint8ClampedArray, count: number): Swatch[] {
  const opaque: number[] = [];
  for (let i = 0; i < rgba.length; i += 4) {
    if (rgba[i + 3] >= 128) opaque.push(rgba[i], rgba[i + 1], rgba[i + 2], 255);
  }
  if (!opaque.length) return [];
  const pixels = new Uint8ClampedArray(opaque);
  const palette = quantize(pixels, count, { format: 'rgb565' });
  const index = applyPalette(pixels, palette, 'rgb565');
  const counts = new Array<number>(palette.length).fill(0);
  for (const i of index) counts[i]++;
  return palette
    .map((c, i): Swatch => {
      const rgb: [number, number, number] = [c[0], c[1], c[2]];
      return { hex: toHex(rgb), rgb, hsl: toHsl(rgb), share: (counts[i] / index.length) * 100 };
    })
    .filter((s) => s.share > 0)
    .sort((a, b) => b.share - a.share);
}

export const toCssVariables = (s: Swatch[]) =>
  `:root {\n${s.map((c, i) => `  --color-${i + 1}: ${c.hex};`).join('\n')}\n}\n`;

export const toJson = (s: Swatch[]) =>
  JSON.stringify(
    s.map((c) => ({ hex: c.hex, rgb: c.rgb, hsl: c.hsl, share: Math.round(c.share * 10) / 10 })),
    null,
    2,
  ) + '\n';

export const toTailwind = (s: Swatch[]) =>
  `// tailwind.config.js\nmodule.exports = {\n  theme: {\n    extend: {\n      colors: {\n        palette: {\n${s
    .map((c, i) => `          ${i + 1}: '${c.hex}',`)
    .join('\n')}\n        },\n      },\n    },\n  },\n};\n`;
