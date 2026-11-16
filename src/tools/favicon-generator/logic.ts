import type { RelRect } from '#lib/core/rect';

export interface Site {
  name: string;
  shortName: string;
  /** `#rrggbb` */
  themeColor: string;
}

export const HEX = /^#[0-9a-f]{6}$/i;

/** The web app manifest as JSON text. */
export function manifest(s: Site): string {
  return (
    JSON.stringify(
      {
        name: s.name,
        short_name: s.shortName,
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
        theme_color: s.themeColor,
        background_color: '#ffffff',
        display: 'standalone',
      },
      null,
      2,
    ) + '\n'
  );
}

const attr = (v: string) => v.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/** The lines to paste into the `<head>` of the site. */
export function headSnippet(s: Site, hasSvg: boolean): string {
  return (
    [
      '<link rel="icon" href="/favicon.ico" sizes="48x48">',
      hasSvg ? '<link rel="icon" href="/favicon.svg" type="image/svg+xml">' : '',
      '<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">',
      '<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">',
      '<link rel="apple-touch-icon" href="/apple-touch-icon.png">',
      '<link rel="manifest" href="/site.webmanifest">',
      `<meta name="theme-color" content="${attr(s.themeColor)}">`,
    ]
      .filter(Boolean)
      .join('\n') + '\n'
  );
}

/**
 * The SVG with its view limited to a square part, given as fractions of the drawing. Only the root tag is
 * touched, as text; the drawing itself is never parsed or run.
 */
export function cropSvg(svg: string, region: RelRect): string {
  const tag = /<svg\b[^>]*>/i.exec(svg);
  if (!tag) return svg;
  const open = tag[0];
  const get = (name: string) =>
    new RegExp(`\\s${name}\\s*=\\s*["']([^"']+)["']`, 'i').exec(open)?.[1];
  const box = get('viewBox')
    ?.trim()
    .split(/[\s,]+/)
    .map(Number);
  let [x0, y0, w, h] =
    box && box.length === 4 && box.every(Number.isFinite)
      ? box
      : [0, 0, parseFloat(get('width') ?? ''), parseFloat(get('height') ?? '')];
  if (!(w > 0) || !(h > 0)) return svg;
  [x0, y0] = [x0 + region.x * w, y0 + region.y * h];
  [w, h] = [region.w * w, region.h * h];
  const round = (n: number) => String(Math.round(n * 1000) / 1000);
  let next = open
    .replace(/\s(viewBox|width|height)\s*=\s*(["'])[^"']*\2/gi, '')
    .replace(
      /<svg\b/i,
      `<svg viewBox="${round(x0)} ${round(y0)} ${round(w)} ${round(h)}" width="${round(w)}" height="${round(h)}"`,
    );
  if (!/\sxmlns\s*=/.test(next))
    next = next.replace(/<svg\b/i, '<svg xmlns="http://www.w3.org/2000/svg"');
  return svg.replace(open, next);
}

/** Sizes of the PNG files, with the names they are saved under. */
export const PNG_ICONS = [
  { name: 'favicon-16x16.png', size: 16 },
  { name: 'favicon-32x32.png', size: 32 },
  { name: 'apple-touch-icon.png', size: 180, opaque: true },
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
] as const;

/** Sizes held inside favicon.ico. */
export const ICO_SIZES = [16, 32, 48] as const;
