// Keeping only some of the tags in an Exif block. The block is read as a TIFF structure and written again
// with the chosen tags; the values are copied byte for byte, so nothing else changes.
// MakerNotes and the embedded thumbnail are never kept: MakerNotes hold offsets that would break, and a
// thumbnail can still show a picture that was cropped or blurred.

/** What a visitor can choose to remove. */
export const EXIF_GROUPS = ['location', 'camera', 'time', 'author', 'other'] as const;
export type ExifGroup = (typeof EXIF_GROUPS)[number];

type Ifd = 'ifd0' | 'exif' | 'gps' | 'interop';

const TIME = new Set([0x0132, 0x9003, 0x9004, 0x9010, 0x9011, 0x9012, 0x9290, 0x9291, 0x9292]);
const AUTHOR = new Set([
  0x010e, 0x0131, 0x013b, 0x8298, 0x9286, 0xa430, 0x9c9b, 0x9c9c, 0x9c9d, 0x9c9e, 0x9c9f,
]);
// Needed to show the picture correctly, and nothing about who or where.
const TECHNICAL = new Set([
  0x0112, 0x011a, 0x011b, 0x0128, 0x0213, 0x9000, 0x9101, 0xa000, 0xa001, 0xa002, 0xa003,
]);
const CAMERA_IFD0 = new Set([0x010f, 0x0110]);

/** Which group a tag belongs to, or null for tags that are always kept. */
export function groupOf(ifd: Ifd, tag: number): ExifGroup | null {
  if (ifd === 'gps') return 'location';
  if (TECHNICAL.has(tag)) return null;
  if (TIME.has(tag)) return 'time';
  if (AUTHOR.has(tag)) return 'author';
  if (ifd === 'exif') return tag === 0x927c || tag === 0xa500 ? 'other' : 'camera';
  if (CAMERA_IFD0.has(tag)) return 'camera';
  return 'other';
}

const SIZES = [0, 1, 1, 2, 4, 8, 1, 1, 2, 4, 8, 4, 8];
const EXIF_POINTER = 0x8769;
const GPS_POINTER = 0x8825;
const INTEROP_POINTER = 0xa005;

interface Entry {
  tag: number;
  type: number;
  count: number;
  data: Uint8Array;
  sub?: Entry[];
}

function read(tiff: Uint8Array): { ifd0: Entry[]; little: boolean } | null {
  if (tiff.length < 8) return null;
  const little = tiff[0] === 0x49 && tiff[1] === 0x49;
  if (!little && !(tiff[0] === 0x4d && tiff[1] === 0x4d)) return null;
  const view = new DataView(tiff.buffer, tiff.byteOffset, tiff.byteLength);
  const u16 = (at: number) => view.getUint16(at, little);
  const u32 = (at: number) => view.getUint32(at, little);
  if (u16(2) !== 42) return null;

  const seen = new Set<number>();
  function ifd(at: number, name: Ifd): Entry[] {
    if (at < 8 || at + 2 > tiff.length || seen.has(at)) return [];
    seen.add(at);
    const n = u16(at);
    const out: Entry[] = [];
    for (let i = 0; i < n; i++) {
      const e = at + 2 + i * 12;
      if (e + 12 > tiff.length) break;
      const tag = u16(e);
      const type = u16(e + 2);
      const count = u32(e + 4);
      const size = (SIZES[type] ?? 0) * count;
      if (!size) continue;
      const start = size <= 4 ? e + 8 : u32(e + 8);
      if (start + size > tiff.length) continue;
      const pointer =
        name === 'ifd0' && tag === EXIF_POINTER
          ? 'exif'
          : name === 'ifd0' && tag === GPS_POINTER
            ? 'gps'
            : name === 'exif' && tag === INTEROP_POINTER
              ? 'interop'
              : null;
      if (pointer)
        out.push({ tag, type, count, data: new Uint8Array(0), sub: ifd(u32(e + 8), pointer) });
      else out.push({ tag, type, count, data: tiff.slice(start, start + size) });
    }
    return out;
  }
  return { ifd0: ifd(u32(4), 'ifd0'), little };
}

function filter(entries: Entry[], name: Ifd, remove: ReadonlySet<ExifGroup>): Entry[] {
  const out: Entry[] = [];
  for (const e of entries) {
    if (e.sub) {
      const subName: Ifd =
        e.tag === EXIF_POINTER ? 'exif' : e.tag === GPS_POINTER ? 'gps' : 'interop';
      // The interoperability block says nothing about the person; it goes with "everything else".
      if (subName === 'interop' && remove.has('other')) continue;
      const kept = filter(e.sub, subName, remove);
      if (kept.length) out.push({ ...e, sub: kept });
      continue;
    }
    const group = groupOf(name, e.tag);
    if (group && remove.has(group)) continue;
    out.push(e);
  }
  return out;
}

function write(entries: Entry[], little: boolean): Uint8Array {
  const parts: number[] = [];
  const view = (n: number) => {
    const b = new Uint8Array(n);
    return { b, v: new DataView(b.buffer) };
  };
  const alloc = (n: number) => {
    const at = parts.length;
    for (let i = 0; i < n; i++) parts.push(0);
    return at;
  };
  const put16 = (at: number, x: number) => {
    const { b, v } = view(2);
    v.setUint16(0, x, little);
    parts[at] = b[0];
    parts[at + 1] = b[1];
  };
  const put32 = (at: number, x: number) => {
    const { b, v } = view(4);
    v.setUint32(0, x, little);
    for (let i = 0; i < 4; i++) parts[at + i] = b[i];
  };

  alloc(8);
  parts[0] = parts[1] = little ? 0x49 : 0x4d;
  put16(2, 42);
  put32(4, 8);

  function writeIfd(list: Entry[], at: number) {
    const table = at;
    put16(table, list.length);
    list.forEach((e, i) => {
      const slot = table + 2 + i * 12;
      put16(slot, e.tag);
      if (e.sub) {
        put16(slot + 2, 4);
        put32(slot + 4, 1);
        const sub = alloc(2 + e.sub.length * 12 + 4);
        put32(slot + 8, sub);
        writeIfd(e.sub, sub);
        return;
      }
      put16(slot + 2, e.type);
      put32(slot + 4, e.count);
      if (e.data.length <= 4) {
        e.data.forEach((x, k) => (parts[slot + 8 + k] = x));
      } else {
        const at2 = alloc(e.data.length + (e.data.length % 2));
        e.data.forEach((x, k) => (parts[at2 + k] = x));
        put32(slot + 8, at2);
      }
    });
    put32(table + 2 + list.length * 12, 0);
  }
  const first = alloc(2 + entries.length * 12 + 4);
  put32(4, first);
  writeIfd(entries, first);
  return Uint8Array.from(parts);
}

/**
 * The Exif block (a TIFF structure) without the tags of the groups in `remove`. Null when nothing is left
 * or the block cannot be read, in which case the whole block should be dropped.
 */
export function filterExif(tiff: Uint8Array, remove: ReadonlySet<ExifGroup>): Uint8Array | null {
  const parsed = read(tiff);
  if (!parsed) return null;
  const kept = filter(parsed.ifd0, 'ifd0', remove);
  return kept.length ? write(kept, parsed.little) : null;
}

/** Groups that have at least one tag in the block (for telling the visitor what was there). */
export function exifGroupsPresent(tiff: Uint8Array): Set<ExifGroup> {
  const found = new Set<ExifGroup>();
  const parsed = read(tiff);
  const walk = (list: Entry[], name: Ifd) => {
    for (const e of list) {
      if (e.sub)
        walk(e.sub, e.tag === EXIF_POINTER ? 'exif' : e.tag === GPS_POINTER ? 'gps' : 'interop');
      else {
        const g = groupOf(name, e.tag);
        if (g) found.add(g);
      }
    }
  };
  if (parsed) walk(parsed.ifd0, 'ifd0');
  return found;
}
