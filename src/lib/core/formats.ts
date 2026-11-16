import type { InputKind, OutputFormat } from '#lib/types';

interface FormatInfo {
  label: string;
  mime: string;
  ext: string;
  /** Extra extensions that map to this kind. */
  alias?: string[];
}

/** Single table of format facts. Add a format here once and every tool understands it. */
export const formats: Record<Exclude<InputKind, 'image'>, FormatInfo> = {
  jpeg: { label: 'JPG', mime: 'image/jpeg', ext: 'jpg', alias: ['jpeg', 'jpe', 'jfif'] },
  png: { label: 'PNG', mime: 'image/png', ext: 'png' },
  webp: { label: 'WebP', mime: 'image/webp', ext: 'webp' },
  avif: { label: 'AVIF', mime: 'image/avif', ext: 'avif' },
  gif: { label: 'GIF', mime: 'image/gif', ext: 'gif' },
  bmp: { label: 'BMP', mime: 'image/bmp', ext: 'bmp' },
  tiff: { label: 'TIFF', mime: 'image/tiff', ext: 'tiff', alias: ['tif'] },
  heic: { label: 'HEIC', mime: 'image/heic', ext: 'heic', alias: ['heif', 'hif'] },
  svg: { label: 'SVG', mime: 'image/svg+xml', ext: 'svg' },
  pdf: { label: 'PDF', mime: 'application/pdf', ext: 'pdf' },
  video: { label: 'Video', mime: 'video/mp4', ext: 'mp4', alias: ['webm', 'mov', 'm4v'] },
};

const imageKinds: InputKind[] = [
  'jpeg',
  'png',
  'webp',
  'avif',
  'gif',
  'bmp',
  'tiff',
  'heic',
  'svg',
];

export const outputFormats: Exclude<OutputFormat, 'original'>[] = ['jpeg', 'png', 'webp', 'avif'];

const ascii = (b: Uint8Array, start: number, text: string) =>
  [...text].every((c, i) => b[start + i] === c.charCodeAt(0));

/** Detect a format from the first bytes of a file (not from its name or reported type). */
export function sniffBytes(b: Uint8Array): InputKind | null {
  if (b.length < 12) return null;
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpeg';
  if (b[0] === 0x89 && ascii(b, 1, 'PNG\r\n')) return 'png';
  if (ascii(b, 0, 'GIF87a') || ascii(b, 0, 'GIF89a')) return 'gif';
  if (ascii(b, 0, 'RIFF') && ascii(b, 8, 'WEBP')) return 'webp';
  if (ascii(b, 0, 'BM')) return 'bmp';
  if (ascii(b, 0, 'II*\0') || ascii(b, 0, 'MM\0*')) return 'tiff';
  if (ascii(b, 0, '%PDF')) return 'pdf';
  if (ascii(b, 4, 'ftyp')) {
    const brand = String.fromCharCode(b[8], b[9], b[10], b[11]);
    if (brand === 'avif' || brand === 'avis') return 'avif';
    if (['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'mif1', 'msf1'].includes(brand)) {
      return 'heic';
    }
    return 'video';
  }
  if (b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) return 'video'; // WebM
  const head = new TextDecoder().decode(b.subarray(0, 256)).trimStart().toLowerCase();
  if (head.startsWith('<svg') || (head.startsWith('<?xml') && head.includes('<svg'))) return 'svg';
  return null;
}

export async function sniff(file: Blob): Promise<InputKind | null> {
  return sniffBytes(new Uint8Array(await file.slice(0, 512).arrayBuffer()));
}

/** Fall back to the extension when the content is not recognized (for example some SVGs). */
export function kindFromName(name: string): InputKind | null {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  for (const [kind, info] of Object.entries(formats)) {
    if (info.ext === ext || info.alias?.includes(ext)) return kind as InputKind;
  }
  return null;
}

export function matchesAccepts(kind: InputKind | null, accepts: InputKind[]): boolean {
  if (!kind) return false;
  return accepts.some((a) => a === kind || (a === 'image' && imageKinds.includes(kind)));
}

/** `accept` attribute for a file input. */
export function acceptAttr(accepts: InputKind[]): string {
  const parts = new Set<string>();
  for (const a of accepts) {
    const kinds = a === 'image' ? imageKinds : [a];
    for (const k of kinds) {
      const f = formats[k as keyof typeof formats];
      if (!f) continue;
      parts.add(f.mime);
      parts.add('.' + f.ext);
      f.alias?.forEach((x) => parts.add('.' + x));
    }
  }
  return [...parts].join(',');
}

export function labelOf(kind: InputKind): string {
  return kind === 'image' ? 'Image' : formats[kind].label;
}
