// Removing metadata from files without touching the picture data (JPEG segments, PNG chunks, WebP chunks).
// When removing it would change how the picture looks (a turned photo, a non-sRGB color profile), the
// caller re-encodes instead; `reencodeReason` says why.
import { EXIF_GROUPS, filterExif, type ExifGroup } from './exif-filter';
import { jpegInfo } from './jpeg';
import { crc32, pngChunks } from './png';

/** What to remove. Everything by default. */
export interface StripOptions {
  /** Groups of Exif tags to remove. Tags that only describe how to show the picture are always kept. */
  exif: ReadonlySet<ExifGroup>;
  /** Remove XMP, IPTC and comments (and PNG text and time chunks). */
  xmpIptc: boolean;
  /** Remove the color profile. */
  icc: boolean;
}

export const REMOVE_ALL: StripOptions = { exif: new Set(EXIF_GROUPS), xmpIptc: true, icc: true };

const allExifGone = (o: StripOptions) => EXIF_GROUPS.every((g) => o.exif.has(g));

export interface Stripped {
  bytes: Uint8Array;
  /** Set when the plain removal would change the picture; the file must be re-encoded instead. */
  reencodeReason?: string;
}

const text = (b: Uint8Array, at: number, n: number) =>
  String.fromCharCode(...b.subarray(at, at + n));

/** An ICC profile counts as sRGB when it says so in its description. */
export function looksSrgb(icc: Uint8Array): boolean {
  return /srgb/i.test(text(icc, 0, Math.min(icc.length, 1024)).replace(/\0/g, ''));
}

const concat = (parts: Uint8Array[]) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
};

/** One piece of a JPEG file: a marker segment (with its marker byte) or the data of a scan (`marker` 0). */
interface JpegPart {
  marker: number;
  bytes: Uint8Array;
}

/** Where the data of a scan ends: at the next marker that is not a stuffed byte or a restart marker. */
function scanEnd(b: Uint8Array, from: number): number {
  for (let i = from; i + 1 < b.length;) {
    if (b[i] !== 0xff) i++;
    else if (b[i + 1] === 0 || (b[i + 1] >= 0xd0 && b[i + 1] <= 0xd7)) i += 2;
    else if (b[i + 1] === 0xff)
      i++; // fill byte
    else return i;
  }
  return b.length;
}

/**
 * The parts of a JPEG up to its end-of-image marker; anything after that marker is not part of the picture
 * and is left out. Fill bytes in front of a marker are skipped, as readers do. Null when the structure is
 * not clean, so callers never trust a guess about where the picture ends.
 */
function jpegParts(b: Uint8Array): JpegPart[] | null {
  if (b.length < 4 || b[0] !== 0xff || b[1] !== 0xd8) return null;
  const parts: JpegPart[] = [{ marker: 0xd8, bytes: b.subarray(0, 2) }];
  let at = 2;
  let scanned = false;
  for (;;) {
    if (at >= b.length) return scanned ? parts : null; // no end-of-image marker: the scan ran to the end
    while (b[at] === 0xff && b[at + 1] === 0xff) at++;
    if (at + 2 > b.length || b[at] !== 0xff) return null;
    const marker = b[at + 1];
    if (marker === 0xd9) {
      if (!scanned) return null;
      parts.push({ marker, bytes: b.subarray(at, at + 2) });
      return parts;
    }
    // Markers without a length cannot appear between segments.
    if (marker === 0x00 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) return null;
    if (at + 4 > b.length) return null;
    const end = at + 2 + ((b[at + 2] << 8) | b[at + 3]);
    if (end < at + 4 || end > b.length) return null;
    parts.push({ marker, bytes: b.subarray(at, end) });
    at = end;
    if (marker === 0xda) {
      scanned = true;
      const next = scanEnd(b, at);
      parts.push({ marker: 0, bytes: b.subarray(at, next) });
      at = next;
    }
  }
}

const SAVED_AGAIN = 'The file could not be read safely, so it was saved again.';

/** Pull the ICC profile out of JPEG APP2 segments (it may span several). */
function jpegIcc(parts: JpegPart[]): Uint8Array | null {
  const found = parts
    .filter((p) => p.marker === 0xe2 && text(p.bytes, 4, 11) === 'ICC_PROFILE')
    .map((p) => p.bytes.subarray(18));
  return found.length ? concat(found) : null;
}

/** Segments that describe the picture itself: frame headers, tables and restart intervals. */
const isStructure = (m: number) => (m >= 0xc0 && m <= 0xcf) || (m >= 0xdb && m <= 0xdf);

/**
 * JPEG without the chosen metadata. Only the segments that describe the picture are kept, plus JFIF and
 * Adobe color information; everything else, and any data after the end of the image, is dropped. A file
 * whose structure cannot be read cleanly is not passed on: the caller saves it again instead.
 */
export function stripJpeg(b: Uint8Array, opts: StripOptions = REMOVE_ALL): Stripped {
  if (b.length < 2 || b[0] !== 0xff || b[1] !== 0xd8) return { bytes: b }; // not a JPEG
  const info = jpegInfo(b);
  const parts = jpegParts(b);
  if (!info || !parts) return { bytes: b, reencodeReason: SAVED_AGAIN };
  const icc = jpegIcc(parts);
  const noExif = allExifGone(opts);
  let reencodeReason: string | undefined;
  if (noExif && info.orientation !== 1)
    reencodeReason = 'The photo is stored turned, so it was saved upright.';
  else if (opts.icc && icc && !looksSrgb(icc))
    reencodeReason = 'The color profile was converted to sRGB.';

  const kept: Uint8Array[] = [];
  for (const { marker, bytes: segment } of parts) {
    const id = text(segment, 4, 29);
    if (
      marker === 0 ||
      marker === 0xd8 ||
      marker === 0xd9 ||
      marker === 0xda ||
      isStructure(marker)
    )
      kept.push(segment);
    else if (marker === 0xe0) {
      if (id.startsWith('JFIF\0')) kept.push(segment); // JFXX carries a thumbnail
    } else if (marker === 0xee) {
      if (id.startsWith('Adobe')) kept.push(segment);
    } else if (marker === 0xe1 && id.startsWith('Exif\0\0')) {
      const tiff = noExif ? null : filterExif(segment.subarray(10), opts.exif);
      if (tiff && tiff.length + 8 <= 0xffff) {
        const head = new Uint8Array(10);
        head.set([0xff, 0xe1, (tiff.length + 8) >> 8, (tiff.length + 8) & 255]);
        head.set([0x45, 0x78, 0x69, 0x66, 0, 0], 4);
        kept.push(head, tiff);
      }
    } else if (marker === 0xe2) {
      if (!opts.icc && id.startsWith('ICC_PROFILE')) kept.push(segment);
    } else if (!opts.xmpIptc) {
      // XMP (APP1), Photoshop/IPTC (APP13) and comments; other application data is never kept.
      if (
        (marker === 0xe1 && id.startsWith('http://ns.adobe.com/')) ||
        (marker === 0xed && id.startsWith('Photoshop 3.0')) ||
        marker === 0xfe
      )
        kept.push(segment);
    }
  }
  return { bytes: concat(kept), reencodeReason };
}

/** PNG without the chosen metadata. */
export function stripPngMetadata(b: Uint8Array, opts: StripOptions = REMOVE_ALL): Stripped {
  const chunks = pngChunks(b);
  let reencodeReason: string | undefined;
  const view = new DataView(b.buffer, b.byteOffset, b.byteLength);
  for (let at = 8; opts.icc && at + 12 <= b.length; at += 12 + view.getUint32(at)) {
    const type = text(b, at + 4, 4);
    if (type === 'iCCP') {
      const name = text(b, at + 8, 80).split('\0')[0];
      if (!/srgb/i.test(name)) reencodeReason = 'The color profile was converted to sRGB.';
    }
    if (type === 'gAMA' && !chunks.includes('sRGB')) {
      const gamma = view.getUint32(at + 8);
      if (gamma < 40000 || gamma > 50000)
        reencodeReason = 'The color profile was converted to sRGB.';
    }
  }
  const keep = new Set(['IHDR', 'PLTE', 'IDAT', 'IEND', 'tRNS']);
  if (!opts.icc) ['iCCP', 'sRGB', 'gAMA', 'cHRM'].forEach((t) => keep.add(t));
  if (!opts.xmpIptc) ['tEXt', 'iTXt', 'zTXt', 'tIME'].forEach((t) => keep.add(t));
  const noExif = allExifGone(opts);
  const kept: Uint8Array[] = [b.subarray(0, 8)];
  for (let at = 8; at + 12 <= b.length; at += 12 + view.getUint32(at)) {
    const type = text(b, at + 4, 4);
    const size = view.getUint32(at);
    if (keep.has(type)) kept.push(b.subarray(at, at + 12 + size));
    else if (type === 'eXIf' && !noExif) {
      const tiff = filterExif(b.subarray(at + 8, at + 8 + size), opts.exif);
      if (tiff) {
        const chunk = new Uint8Array(12 + tiff.length);
        new DataView(chunk.buffer).setUint32(0, tiff.length);
        chunk.set([0x65, 0x58, 0x49, 0x66], 4);
        chunk.set(tiff, 8);
        new DataView(chunk.buffer).setUint32(
          8 + tiff.length,
          crc32(chunk.subarray(4, 8 + tiff.length)),
        );
        kept.push(chunk);
      }
    }
    if (type === 'IEND') break; // bytes after the end chunk are not part of the picture
  }
  return { bytes: concat(kept), reencodeReason };
}

/** WebP chunks that make up the picture: header, image data, alpha and animation. */
const WEBP_PICTURE = new Set(['VP8X', 'VP8 ', 'VP8L', 'ALPH', 'ANIM', 'ANMF']);

/** WebP without the chosen metadata; the VP8X flags and the RIFF size are updated to match. */
export function stripWebp(b: Uint8Array, opts: StripOptions = REMOVE_ALL): Stripped {
  if (b.length < 20 || text(b, 0, 4) !== 'RIFF' || text(b, 8, 4) !== 'WEBP') return { bytes: b };
  const view = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const kept: Uint8Array[] = [];
  const present = new Set<string>();
  let reencodeReason: string | undefined;
  const noExif = allExifGone(opts);
  const limit = Math.min(b.length, 8 + view.getUint32(4, true)); // bytes after the RIFF data are not part of the file
  for (let at = 12; at + 8 <= limit;) {
    const type = text(b, at, 4);
    const size = view.getUint32(at + 4, true);
    const end = Math.min(limit, at + 8 + size + (size % 2));
    if (type === 'ICCP') {
      if (opts.icc) {
        if (!looksSrgb(b.subarray(at + 8, at + 8 + size)))
          reencodeReason = 'The color profile was converted to sRGB.';
      } else {
        kept.push(b.slice(at, end));
        present.add(type);
      }
    } else if (type === 'EXIF') {
      let data = b.subarray(at + 8, at + 8 + size);
      if (text(data, 0, 6) === 'Exif\0\0') data = data.subarray(6);
      const tiff = noExif ? null : filterExif(data, opts.exif);
      if (tiff) {
        const chunk = new Uint8Array(8 + tiff.length + (tiff.length % 2));
        chunk.set([0x45, 0x58, 0x49, 0x46]);
        new DataView(chunk.buffer).setUint32(4, tiff.length, true);
        chunk.set(tiff, 8);
        kept.push(chunk);
        present.add(type);
      }
    } else if (type === 'XMP ') {
      if (!opts.xmpIptc) {
        kept.push(b.slice(at, end));
        present.add(type);
      }
    } else if (WEBP_PICTURE.has(type)) {
      kept.push(b.slice(at, end));
    } // any other chunk (provenance data, private data) is dropped
    at = end;
  }
  const body = concat(kept);
  const out = new Uint8Array(12 + body.length);
  out.set(b.subarray(0, 12));
  out.set(body, 12);
  // Flags of the extended header: 0x20 color profile, 0x08 Exif, 0x04 XMP.
  if (text(out, 12, 4) === 'VP8X') {
    out[20] &= ~(0x20 | 0x08 | 0x04);
    if (present.has('ICCP')) out[20] |= 0x20;
    if (present.has('EXIF')) out[20] |= 0x08;
    if (present.has('XMP ')) out[20] |= 0x04;
  }
  new DataView(out.buffer).setUint32(4, out.length - 8, true);
  return { bytes: out, reencodeReason };
}
