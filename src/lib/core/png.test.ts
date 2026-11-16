import { describe, expect, it } from 'vitest';
import { pngChunks, stripPng } from './png';

/** A PNG made of the given chunk types, with empty data and zero checksums (enough for chunk walking). */
function fake(types: string[]): Uint8Array {
  const parts: number[] = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  for (const t of types) parts.push(0, 0, 0, 0, ...new TextEncoder().encode(t), 0, 0, 0, 0);
  return new Uint8Array(parts);
}

describe('stripPng', () => {
  it('removes text, Exif, time and private chunks but keeps the picture and its color data', () => {
    const png = fake([
      'IHDR',
      'tEXt',
      'eXIf',
      'iCCP',
      'tIME',
      'zTXt',
      'iTXt',
      'pHYs',
      'prVt',
      'IDAT',
      'IEND',
    ]);
    expect(pngChunks(stripPng(png))).toEqual(['IHDR', 'iCCP', 'pHYs', 'IDAT', 'IEND']);
  });

  it('keeps palette and transparency', () => {
    expect(pngChunks(stripPng(fake(['IHDR', 'PLTE', 'tRNS', 'IDAT', 'IEND'])))).toEqual([
      'IHDR',
      'PLTE',
      'tRNS',
      'IDAT',
      'IEND',
    ]);
  });

  it('leaves other data alone', () => {
    const notPng = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(stripPng(notPng)).toBe(notPng);
  });
});
