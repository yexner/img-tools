import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { jpegInfo } from './jpeg';
import { addText } from './png-test-util';
import { pngChunks } from './png';
import { looksSrgb, stripJpeg, stripPngMetadata, stripWebp } from './strip';

const file = (name: string) => new Uint8Array(readFileSync(`tests/fixtures/${name}`));

/** Tags exiftool still finds in a file; null when exiftool is not installed. */
function tags(name: string, bytes: Uint8Array): string[] | null {
  const path = join(mkdtempSync(join(tmpdir(), 'strip-')), name);
  writeFileSync(path, bytes);
  const r = spawnSync(
    'exiftool',
    [
      '-s',
      '-G1',
      '-EXIF:all',
      '-GPS:all',
      '-XMP:all',
      '-ICC_Profile:all',
      '-IPTC:all',
      '-Comment',
      path,
    ],
    { encoding: 'utf8' },
  );
  return r.error ? null : r.stdout.trim().split('\n').filter(Boolean);
}

describe('stripJpeg', () => {
  it('removes Exif and GPS but keeps the picture bytes', () => {
    const src = file('photo-gps.jpg');
    const out = stripJpeg(src);
    expect(out.reencodeReason).toBeUndefined();
    expect(out.bytes.length).toBeLessThan(src.length);
    const left = tags('a.jpg', out.bytes);
    if (left) expect(left).toEqual([]);
    expect(jpegInfo(out.bytes)).toMatchObject({ width: 120, height: 90 });
    // The picture data after the start-of-scan marker is identical.
    const sos = (b: Uint8Array) => b.findIndex((v, i) => v === 0xff && b[i + 1] === 0xda);
    expect(out.bytes.subarray(sos(out.bytes))).toEqual(src.subarray(sos(src)));
  });

  it('asks for a re-encode when the photo is stored turned', () => {
    expect(stripJpeg(file('rotated.jpg')).reencodeReason).toMatch(/upright/);
  });

  it('keeps JFIF so the file still opens everywhere', () => {
    const out = stripJpeg(file('dpi-300.jpg')).bytes;
    expect(String.fromCharCode(...out.subarray(6, 10))).toBe('JFIF');
  });

  it('leaves other data alone', () => {
    const junk = new Uint8Array([1, 2, 3]);
    expect(stripJpeg(junk).bytes).toBe(junk);
  });
});

/** The JPEG with `extra` inserted in front of its first segment with this marker. */
function jpegWith(src: Uint8Array, marker: number, extra: number[]): Uint8Array {
  let at = 2;
  while (src[at] === 0xff && src[at + 1] !== marker) at += 2 + ((src[at + 2] << 8) | src[at + 3]);
  expect(src[at + 1]).toBe(marker);
  return new Uint8Array([...src.subarray(0, at), ...extra, ...src.subarray(at)]);
}

const latin1 = (b: Uint8Array) => new TextDecoder('latin1').decode(b);

describe('stripJpeg on files that bend the rules', () => {
  const gps = file('photo-gps.jpg');

  it('removes Exif that follows fill bytes', () => {
    const padded = jpegWith(gps, 0xe1, [0xff]);
    expect(jpegInfo(padded)).not.toBeNull(); // readers accept it, so it must be cleaned too
    const out = stripJpeg(padded);
    expect(out.reencodeReason).toBeUndefined();
    expect(latin1(out.bytes)).not.toContain('Exif');
    expect(latin1(out.bytes)).not.toContain('Testcam');
    expect(jpegInfo(out.bytes)).toMatchObject({ width: 120, height: 90 });
  });

  it('drops everything after the end of the image', () => {
    const tail = new TextEncoder().encode('\xff\xd8\xff\xe1SECRET-GPS-TAIL');
    const out = stripJpeg(new Uint8Array([...gps, ...tail]));
    expect(latin1(out.bytes)).not.toContain('SECRET-GPS-TAIL');
    expect([...out.bytes.subarray(-2)]).toEqual([0xff, 0xd9]);
  });

  it('asks for a re-encode when the segments cannot be read, instead of passing the file on', () => {
    const broken = new Uint8Array([...gps.subarray(0, 2), 0x00, 0x00, ...gps.subarray(2)]);
    expect(stripJpeg(broken).reencodeReason).toMatch(/saved again/);
    const noScan = gps.subarray(0, gps.findIndex((v, i) => v === 0xff && gps[i + 1] === 0xda) + 2);
    expect(stripJpeg(noScan).reencodeReason).toMatch(/saved again/);
  });

  it('drops the JFXX thumbnail but keeps JFIF', () => {
    const jfxx = [0xff, 0xe0, 0x00, 0x09, ...new TextEncoder().encode('JFXX\0'), 0x10, 0x01];
    const src = jpegWith(file('dpi-300.jpg'), 0xdb, jfxx);
    expect(latin1(src)).toContain('JFXX');
    const out = stripJpeg(src).bytes;
    expect(latin1(out)).not.toContain('JFXX');
    expect(latin1(out.subarray(0, 12))).toContain('JFIF');
  });

  it('drops private application segments and multi-picture data', () => {
    const app = (marker: number, id: string) => [
      0xff,
      marker,
      0x00,
      id.length + 4,
      ...new TextEncoder().encode(id),
      1,
      2,
    ];
    const src = jpegWith(file('dpi-300.jpg'), 0xdb, [...app(0xe2, 'MPF\0'), ...app(0xe5, 'Priv')]);
    const out = latin1(stripJpeg(src).bytes);
    expect(out).not.toContain('MPF');
    expect(out).not.toContain('Priv');
  });
});

describe('stripPngMetadata', () => {
  it('removes text, time and resolution chunks', () => {
    const png = addText(file('dpi-150.png'), 'Comment', 'secret');
    const out = stripPngMetadata(png);
    expect(pngChunks(out.bytes)).not.toContain('tEXt');
    expect(pngChunks(out.bytes)).not.toContain('pHYs');
    expect(pngChunks(out.bytes)).toContain('IDAT');
    expect(out.reencodeReason).toBeUndefined();
  });

  it('drops data after IEND', () => {
    const png = file('dpi-150.png');
    const tail = new TextEncoder().encode('SECRET-PNG-TAIL');
    const out = stripPngMetadata(new Uint8Array([...png, ...tail]));
    expect(latin1(out.bytes)).not.toContain('SECRET-PNG-TAIL');
    expect(pngChunks(out.bytes).at(-1)).toBe('IEND');
  });
});

describe('stripWebp', () => {
  /** A WebP made of the given chunks, with the RIFF size filled in. */
  function webp(chunks: [string, number[]][], flags = 0): Uint8Array {
    const parts: number[] = [];
    for (const [type, data] of chunks) {
      const padded = data.length % 2 ? [...data, 0] : data;
      parts.push(
        ...new TextEncoder().encode(type),
        data.length & 255,
        (data.length >> 8) & 255,
        0,
        0,
        ...padded,
      );
    }
    const body = [...new TextEncoder().encode('WEBP'), ...parts];
    const out = new Uint8Array(8 + body.length);
    out.set(new TextEncoder().encode('RIFF'));
    new DataView(out.buffer).setUint32(4, body.length, true);
    out.set(body, 8);
    void flags;
    return out;
  }

  it('drops EXIF, XMP and ICC chunks and fixes the sizes and flags', () => {
    const src = webp([
      ['VP8X', [0x3c, 0, 0, 0, 9, 0, 0, 9, 0, 0]], // ICC, alpha, EXIF and XMP flags set
      ['ICCP', Array.from(new TextEncoder().encode('sRGB profile'))],
      ['VP8 ', [1, 2, 3, 4]],
      ['EXIF', [9, 9, 9]],
      ['XMP ', [8, 8]],
    ]);
    const out = stripWebp(src);
    expect(out.reencodeReason).toBeUndefined();
    const s = new TextDecoder('latin1').decode(out.bytes);
    expect(s).not.toContain('EXIF');
    expect(s).not.toContain('XMP ');
    expect(s).not.toContain('ICCP');
    expect(s).toContain('VP8 ');
    expect(new DataView(out.bytes.buffer).getUint32(4, true)).toBe(out.bytes.length - 8);
    expect(out.bytes[20] & (0x20 | 0x08 | 0x04)).toBe(0);
    expect(out.bytes[20] & 0x10).toBe(0x10); // the alpha flag stays
  });

  it('keeps only the chunks that make the picture', () => {
    const src = webp([
      ['VP8X', [0x10, 0, 0, 0, 9, 0, 0, 9, 0, 0]],
      ['C2PA', [7, 7]],
      ['VP8 ', [1, 2, 3, 4]],
      ['ALPH', [5, 6]],
    ]);
    const s = latin1(stripWebp(src).bytes);
    expect(s).not.toContain('C2PA');
    expect(s).toContain('VP8 ');
    expect(s).toContain('ALPH');
  });

  it('ignores bytes after the end of the RIFF data', () => {
    const src = webp([['VP8 ', [1, 2, 3, 4]]]);
    const tail = new TextEncoder().encode('EXIF\x04\0\0\0SECRET');
    const out = stripWebp(new Uint8Array([...src, ...tail]));
    expect(latin1(out.bytes)).not.toContain('SECRET');
    expect(new DataView(out.bytes.buffer).getUint32(4, true)).toBe(out.bytes.length - 8);
  });

  it('asks for a re-encode for a color profile that is not sRGB', () => {
    const src = webp([
      ['VP8X', [0x20, 0, 0, 0, 9, 0, 0, 9, 0, 0]],
      ['ICCP', Array.from(new TextEncoder().encode('Display P3'))],
      ['VP8 ', [1, 2]],
    ]);
    expect(stripWebp(src).reencodeReason).toMatch(/sRGB/);
  });

  it('removes the sRGB profile Chromium writes, without asking for a re-encode', () => {
    const src = file('sample.webp');
    expect(new TextDecoder('latin1').decode(src)).toContain('ICCP');
    const out = stripWebp(src);
    expect(out.reencodeReason).toBeUndefined();
    expect(new TextDecoder('latin1').decode(out.bytes)).not.toContain('ICCP');
    expect(new DataView(out.bytes.buffer).getUint32(4, true)).toBe(out.bytes.length - 8);
  });
});

describe('looksSrgb', () => {
  it('recognizes the sRGB description', () => {
    expect(looksSrgb(new TextEncoder().encode('....sRGB IEC61966-2.1'))).toBe(true);
    expect(looksSrgb(new TextEncoder().encode('Display P3'))).toBe(false);
  });
});
