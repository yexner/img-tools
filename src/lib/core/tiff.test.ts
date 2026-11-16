import { describe, expect, it } from 'vitest';
import { buildTiff } from '../../../tests/helpers/tiff';
import { sniffBytes } from './formats';
import { tiffPageCount } from './tiff';

const blobOf = (bytes: Uint8Array) => new Blob([bytes as BlobPart]);

describe('tiffPageCount', () => {
  it('counts one page for a single-page file', async () => {
    const bytes = buildTiff([{ width: 4, height: 3, rgb: [255, 0, 0] }]);
    expect(sniffBytes(new Uint8Array([...bytes, ...new Array(16).fill(0)]))).toBe('tiff');
    expect(await tiffPageCount(blobOf(bytes))).toBe(1);
  });

  it('counts every full page', async () => {
    const bytes = buildTiff([
      { width: 4, height: 3, rgb: [255, 0, 0] },
      { width: 4, height: 3, rgb: [0, 255, 0] },
      { width: 4, height: 3, rgb: [0, 0, 255] },
    ]);
    expect(await tiffPageCount(blobOf(bytes))).toBe(3);
  });

  it('ignores reduced-resolution copies', async () => {
    const bytes = buildTiff([
      { width: 8, height: 6, rgb: [255, 0, 0] },
      { width: 4, height: 3, rgb: [255, 0, 0], reduced: true },
      { width: 8, height: 6, rgb: [0, 255, 0] },
    ]);
    expect(await tiffPageCount(blobOf(bytes))).toBe(2);
  });

  it('survives a truncated file', async () => {
    const bytes = buildTiff([{ width: 4, height: 3, rgb: [255, 0, 0] }]);
    expect(await tiffPageCount(blobOf(bytes.slice(0, 20)))).toBe(1);
  });
});
