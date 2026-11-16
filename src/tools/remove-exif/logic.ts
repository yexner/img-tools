import { image, sniff } from '#lib/core';
import { readMeta, summarizeMeta } from '#lib/core/meta';
import { EXIF_GROUPS, type ExifGroup } from '#lib/core/exif-filter';
import {
  REMOVE_ALL,
  stripJpeg,
  stripPngMetadata,
  stripWebp,
  type StripOptions,
  type Stripped,
} from '#lib/core/strip';
import type { InputKind, OutputFormat } from '#lib/types';

const MIME = { jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' } as const;

const removable: Partial<Record<InputKind, (b: Uint8Array, o: StripOptions) => Stripped>> = {
  jpeg: stripJpeg,
  png: stripPngMetadata,
  webp: stripWebp,
};

/** What a visitor can tick, in the order shown. */
export const CHOICES = [
  { id: 'location', label: 'Location (GPS)' },
  { id: 'camera', label: 'Camera, lens and exposure settings' },
  { id: 'time', label: 'Date and time' },
  { id: 'author', label: 'Author, copyright, software and description' },
  { id: 'other', label: 'Other Exif tags, maker notes and the thumbnail' },
  { id: 'xmpIptc', label: 'XMP, IPTC and comments' },
  { id: 'icc', label: 'Color profile' },
] as const;
export type ChoiceId = (typeof CHOICES)[number]['id'];

/** The ticked boxes as removal options. Everything is removed when everything is ticked. */
export function optionsFrom(removed: Record<ChoiceId, boolean>): StripOptions {
  return {
    exif: new Set<ExifGroup>(EXIF_GROUPS.filter((g) => removed[g])),
    xmpIptc: removed.xmpIptc,
    icc: removed.icc,
  };
}

interface Cleaned {
  blob: Blob;
  note: string;
}

/**
 * Remove all metadata from one file. JPEG, PNG and WebP are cleaned without touching the picture data.
 * Anything else, a different format choice, a turned photo or a non-sRGB color profile is saved again.
 */
export async function clean(
  file: File,
  format: OutputFormat,
  quality: number,
  signal: AbortSignal,
  options: StripOptions = REMOVE_ALL,
): Promise<Cleaned> {
  const kind = await sniff(file);
  const meta = await readMeta(file);
  const removed = summarizeMeta(meta);
  const said = removed ? `Removed: ${removed}.` : 'No metadata was found.';

  const strip = format === 'original' && kind ? removable[kind] : undefined;
  if (strip && kind && kind in MIME) {
    const out = strip(new Uint8Array(await file.arrayBuffer()), options);
    if (!out.reencodeReason) {
      return {
        blob: new Blob([out.bytes as BlobPart], { type: MIME[kind as keyof typeof MIME] }),
        note: said,
      };
    }
    const r = await image(file, signal).encode(format, { quality });
    return { blob: r.blob, note: `${said} ${out.reencodeReason}` };
  }
  const r = await image(file, signal).encode(format, { quality });
  return { blob: r.blob, note: `${said}${r.note ? ` ${r.note}` : ''}` };
}
