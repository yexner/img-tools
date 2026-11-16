import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readDpi } from './dims';
import { setJpegDpi } from './dpi';
import { crc32, pngChunks, setPngDpi } from './png';

const file = (name: string) => new Uint8Array(readFileSync(`tests/fixtures/${name}`));

describe('crc32', () => {
  it('matches the standard check value', () => {
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926);
  });
});

describe('setJpegDpi', () => {
  it('rewrites the JFIF density', () => {
    const out = setJpegDpi(file('dpi-300.jpg'), 150);
    expect(readDpi(out, 'jpeg')).toEqual({ x: 150, y: 150 });
    expect(out.length).toBe(file('dpi-300.jpg').length);
  });

  it('adds a JFIF header when there is none', () => {
    const jpeg = file('sample.jpg');
    const length = (jpeg[4] << 8) | jpeg[5]; // drop the JFIF segment
    const noJfif = new Uint8Array([...jpeg.subarray(0, 2), ...jpeg.subarray(4 + length)]);
    expect(noJfif[3]).not.toBe(0xe0);
    const out = setJpegDpi(noJfif, 300);
    expect(out.length).toBe(noJfif.length + 18);
    expect(readDpi(out, 'jpeg')).toEqual({ x: 300, y: 300 });
  });

  it('leaves other data alone', () => {
    const data = new Uint8Array([1, 2, 3]);
    expect(setJpegDpi(data, 300)).toBe(data);
  });
});

describe('setPngDpi', () => {
  it('stores the resolution and keeps the picture data', () => {
    const png = file('sample.png');
    const out = setPngDpi(png, 300);
    const dpi = readDpi(out, 'png');
    expect(dpi?.x).toBeCloseTo(300, 0);
    expect(pngChunks(out).slice(0, 2)).toEqual(['IHDR', 'pHYs']);
    expect(pngChunks(out).filter((c) => c === 'IDAT').length).toBe(
      pngChunks(png).filter((c) => c === 'IDAT').length,
    );
  });

  it('replaces an existing resolution', () => {
    const out = setPngDpi(file('dpi-150.png'), 600);
    expect(readDpi(out, 'png')?.x).toBeCloseTo(600, 0);
    expect(pngChunks(out).filter((c) => c === 'pHYs').length).toBe(1);
  });
});

describe('real tools agree', () => {
  const run = (name: string, bytes: Uint8Array, args: string[]) => {
    const path = join(mkdtempSync(join(tmpdir(), 'dpi-')), name);
    writeFileSync(path, bytes);
    const r = spawnSync('exiftool', ['-s3', ...args, path], { encoding: 'utf8' });
    return r.error ? null : r.stdout.trim().split('\n');
  };

  it('exiftool reads the JPEG density we wrote', () => {
    const out = run('a.jpg', setJpegDpi(file('sample.jpg'), 300), [
      '-XResolution',
      '-ResolutionUnit',
    ]);
    if (out) expect(out).toEqual(['300', 'inches']);
  });

  it('exiftool reads the PNG resolution and the checksum is valid', () => {
    const out = run('a.png', setPngDpi(file('sample.png'), 300), ['-PixelsPerUnitX', '-Warning']);
    if (out) expect(out).toEqual(['11811']); // 300 DPI = 11811 pixels per meter, and no warning line
  });
});
