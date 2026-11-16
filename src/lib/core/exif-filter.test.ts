import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { exifGroupsPresent, filterExif, groupOf, type ExifGroup } from './exif-filter';
import { REMOVE_ALL, stripJpeg, stripPngMetadata, stripWebp, type StripOptions } from './strip';

const file = (name: string) => new Uint8Array(readFileSync(`tests/fixtures/${name}`));
const without = (...groups: ExifGroup[]): StripOptions => ({
  ...REMOVE_ALL,
  exif: new Set(groups),
});

/** `Tag: value` lines exiftool finds; null when exiftool is not installed. */
function tags(name: string, bytes: Uint8Array, args: string[] = ['-EXIF:all', '-GPS:all']) {
  const path = join(mkdtempSync(join(tmpdir(), 'exif-')), name);
  writeFileSync(path, bytes);
  const r = spawnSync('exiftool', ['-s', ...args, path], { encoding: 'utf8' });
  return r.error ? null : r.stdout.trim().split('\n').filter(Boolean);
}
const has = (list: string[], tag: string) => list.some((l) => l.startsWith(tag + ' '));

function tiffOf(jpeg: Uint8Array): Uint8Array {
  for (let at = 2; at + 10 < jpeg.length;) {
    const len = (jpeg[at + 2] << 8) | jpeg[at + 3];
    if (jpeg[at + 1] === 0xe1 && String.fromCharCode(...jpeg.subarray(at + 4, at + 8)) === 'Exif')
      return jpeg.subarray(at + 10, at + 2 + len);
    at += 2 + len;
  }
  throw new Error('no Exif');
}

describe('groupOf', () => {
  it('sorts tags into the groups a visitor can choose', () => {
    expect(groupOf('gps', 0x0002)).toBe('location');
    expect(groupOf('ifd0', 0x010f)).toBe('camera');
    expect(groupOf('exif', 0x829a)).toBe('camera');
    expect(groupOf('exif', 0x9003)).toBe('time');
    expect(groupOf('ifd0', 0x013b)).toBe('author');
    expect(groupOf('ifd0', 0x0112)).toBeNull();
  });

  it('counts the camera owner name as the author, not the camera', () => {
    expect(groupOf('exif', 0xa430)).toBe('author');
  });
});

describe('filterExif', () => {
  const tiff = tiffOf(file('photo-gps.jpg'));

  it('finds the groups in a photo', () => {
    const present = exifGroupsPresent(tiff);
    expect(present.has('location')).toBe(true);
    expect(present.has('camera')).toBe(true);
    expect(present.has('time')).toBe(true);
  });

  it('removes only the chosen groups', () => {
    const kept = filterExif(tiff, new Set<ExifGroup>(['location']))!;
    const present = exifGroupsPresent(kept);
    expect(present.has('location')).toBe(false);
    expect(present.has('camera')).toBe(true);
    expect(present.has('time')).toBe(true);
  });

  it('gives nothing back when every group is removed and only display tags remain', () => {
    const all = new Set<ExifGroup>(['location', 'camera', 'time', 'author', 'other']);
    const left = filterExif(tiff, all);
    if (left) expect(exifGroupsPresent(left).size).toBe(0);
  });
});

describe('selective removal', () => {
  it('JPEG: removing only the location keeps camera and time, and the picture bytes', () => {
    const src = file('photo-gps.jpg');
    const out = stripJpeg(src, without('location'));
    expect(out.reencodeReason).toBeUndefined();
    const list = tags('a.jpg', out.bytes);
    if (list) {
      expect(list.some((l) => l.startsWith('GPS'))).toBe(false);
      expect(has(list, 'Model')).toBe(true);
      expect(has(list, 'DateTimeOriginal')).toBe(true);
    }
    // The compressed picture data is the same.
    const scan = (b: Uint8Array) =>
      b.subarray(b.findIndex((_, i) => b[i] === 0xff && b[i + 1] === 0xda));
    expect(scan(out.bytes)).toEqual(scan(src));
  });

  it('JPEG: keeping the time removes the camera and location but not the date', () => {
    const out = stripJpeg(file('photo-gps.jpg'), without('location', 'camera', 'author', 'other'));
    const list = tags('b.jpg', out.bytes);
    if (list) {
      expect(has(list, 'Model')).toBe(false);
      expect(list.some((l) => l.startsWith('GPS'))).toBe(false);
      expect(has(list, 'DateTimeOriginal')).toBe(true);
    }
  });

  it('JPEG: keeping the color profile or comments leaves them in', () => {
    const src = file('photo-gps.jpg');
    const all = stripJpeg(src, REMOVE_ALL).bytes;
    const keepComments = stripJpeg(src, { ...REMOVE_ALL, xmpIptc: false }).bytes;
    expect(keepComments.length).toBeGreaterThanOrEqual(all.length);
  });

  it('a turned photo is only saved again when every Exif group is removed', () => {
    const turned = file('rotated.jpg');
    expect(stripJpeg(turned, REMOVE_ALL).reencodeReason).toMatch(/upright/);
    expect(stripJpeg(turned, without('location')).reencodeReason).toBeUndefined();
  });

  it('PNG and WebP: Exif made by exiftool is filtered the same way', () => {
    const dir = mkdtempSync(join(tmpdir(), 'exif-'));
    for (const [name, strip] of [
      ['sample.png', stripPngMetadata],
      ['sample.webp', stripWebp],
    ] as const) {
      const path = join(dir, name);
      copyFileSync(`tests/fixtures/${name}`, path);
      const r = spawnSync('exiftool', [
        '-overwrite_original',
        '-Make=Acme',
        '-Model=Cam',
        '-GPSLatitude=48.8',
        '-GPSLatitudeRef=N',
        path,
      ]);
      if (r.error || r.status !== 0) return; // exiftool is not installed
      const out = strip(new Uint8Array(readFileSync(path)), without('location'));
      const list = tags(name, out.bytes, ['-EXIF:all', '-GPS:all', '-XMP:all'])!;
      expect(
        list.some((l) => l.startsWith('GPS')),
        name,
      ).toBe(false);
      expect(has(list, 'Model'), name).toBe(true);
    }
  });
});
