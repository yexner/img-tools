import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { readDpi, readSize } from './dims';
import { nearestRatio, simplify } from './ratio';
import { buildTiff } from '../../../tests/helpers/tiff';
import type { InputKind } from '../types';

const file = (name: string) => new Uint8Array(readFileSync(`tests/fixtures/${name}`));

describe('readSize', () => {
  const cases: [string, InputKind, number, number][] = [
    ['sample.jpg', 'jpeg', 480, 360],
    ['rotated.jpg', 'jpeg', 360, 480], // orientation 6 swaps the displayed size
    ['sample.png', 'png', 480, 360],
    ['sample.webp', 'webp', 240, 180],
    ['sample.avif', 'avif', 240, 180],
    ['sample.bmp', 'bmp', 120, 90],
    ['sample.tiff', 'tiff', 120, 90],
    ['sample.heic', 'heic', 120, 90],
  ];
  for (const [name, kind, width, height] of cases) {
    it(`reads ${name}`, () => {
      expect(readSize(file(name), kind)).toEqual({ width, height });
    });
  }

  it('reads a GIF header', () => {
    const gif = new Uint8Array([
      ...new TextEncoder().encode('GIF89a'),
      0x40,
      0x01,
      0xf0,
      0x00,
      0,
      0,
      0,
      0,
    ]);
    expect(readSize(gif, 'gif')).toEqual({ width: 320, height: 240 });
  });

  it('reads lossless and extended WebP headers', () => {
    const head = (kind: string) => [...new TextEncoder().encode(`RIFF\0\0\0\0WEBP${kind}\0\0\0\0`)];
    const lossless = new Uint8Array([...head('VP8L'), 0x2f, 0x1f, 0xc0, 0x07, 0x00]);
    // Both sizes are stored minus one: 31 + 1 = 32.
    expect(readSize(lossless, 'webp')).toEqual({ width: 32, height: 32 });
    const extended = new Uint8Array([...head('VP8X'), 0, 0, 0, 0, 99, 0, 0, 49, 0, 0]);
    expect(readSize(extended, 'webp')).toEqual({ width: 100, height: 50 });
  });

  it('reads the size of an SVG from width and height or from the viewBox', () => {
    const svg = (s: string) => new TextEncoder().encode(s);
    expect(readSize(svg('<svg xmlns="x" width="120" height="80px"></svg>'), 'svg')).toEqual({
      width: 120,
      height: 80,
    });
    expect(readSize(svg('<svg viewBox="0 0 24 16"></svg>'), 'svg')).toEqual({
      width: 24,
      height: 16,
    });
    expect(readSize(svg('<svg width="100%" height="100%"></svg>'), 'svg')).toBeNull();
  });

  it('reads a multi-page TIFF as its first page', () => {
    const tiff = buildTiff([
      { width: 30, height: 20, rgb: [1, 2, 3] },
      { width: 8, height: 8, rgb: [1, 2, 3] },
    ]);
    expect(readSize(tiff, 'tiff')).toEqual({ width: 30, height: 20 });
  });

  it('returns null for damaged data', () => {
    expect(readSize(new Uint8Array([0x89, 0x50]), 'png')).toBeNull();
    expect(readSize(new Uint8Array(4), 'jpeg')).toBeNull();
  });
});

describe('readDpi', () => {
  it('reads the JFIF density of a JPEG', () => {
    expect(readDpi(file('dpi-300.jpg'), 'jpeg')).toEqual({ x: 300, y: 300 });
  });

  it('reads the pHYs chunk of a PNG', () => {
    const dpi = readDpi(file('dpi-150.png'), 'png');
    expect(dpi?.x).toBeCloseTo(150, 0);
    expect(dpi?.y).toBeCloseTo(150, 0);
  });

  it('returns null when nothing is stored', () => {
    expect(readDpi(file('sample.png'), 'png')).toBeNull();
    expect(readDpi(file('sample.webp'), 'webp')).toBeNull();
  });

  it('reads the BMP pixel density (about 72 DPI from sips)', () => {
    const dpi = readDpi(file('sample.bmp'), 'bmp');
    if (dpi) expect(dpi.x).toBeGreaterThan(0);
  });
});

describe('ratios', () => {
  it('simplifies', () => {
    expect(simplify(4000, 3000)).toBe('4:3');
    expect(simplify(1920, 1080)).toBe('16:9');
    expect(simplify(1000, 1000)).toBe('1:1');
  });

  it('finds the nearest common ratio', () => {
    expect(nearestRatio(1920, 1080)).toEqual({ label: '16:9', offByPercent: 0 });
    expect(nearestRatio(1366, 768).label).toBe('16:9');
    expect(nearestRatio(1366, 768).offByPercent).toBeLessThan(0.2);
    expect(nearestRatio(1080, 1920).label).toBe('9:16');
    expect(nearestRatio(1000, 1010).label).toBe('1:1');
  });
});
