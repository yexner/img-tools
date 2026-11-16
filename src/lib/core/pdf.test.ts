import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { jpegInfo } from './jpeg';
import { buildPdf, deflate, placement, splitRgba } from './pdf';

const jpeg = new Uint8Array(readFileSync('tests/fixtures/sample.jpg'));

/** A JPEG header carrying an Exif orientation, followed by a start-of-frame marker. */
function jpegWithOrientation(orientation: number, little = true): Uint8Array {
  const u16 = (v: number) => (little ? [v & 255, v >> 8] : [v >> 8, v & 255]);
  const u32 = (v: number) => (little ? [v & 255, (v >> 8) & 255, 0, 0] : [0, 0, v >> 8, v & 255]);
  const tiff = [
    ...(little ? [0x49, 0x49] : [0x4d, 0x4d]),
    ...u16(42),
    ...u32(8),
    ...u16(1),
    ...u16(0x0112),
    ...u16(3),
    ...u32(1),
    ...u16(orientation),
    0,
    0,
    ...u32(0),
  ];
  const exif = [...new TextEncoder().encode('Exif\0\0'), ...tiff];
  const sof = [8, 0, 20, 0, 30, 3, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1];
  return new Uint8Array([
    0xff,
    0xd8,
    0xff,
    0xe1,
    (exif.length + 2) >> 8,
    (exif.length + 2) & 255,
    ...exif,
    0xff,
    0xc0,
    0,
    sof.length + 2,
    ...sof,
    0xff,
    0xd9,
  ]);
}

describe('jpegInfo', () => {
  it('reads size and components', () => {
    expect(jpegInfo(jpeg)).toEqual({ width: 480, height: 360, components: 3, orientation: 1 });
  });

  it('reads the orientation in both byte orders', () => {
    for (const little of [true, false]) {
      for (const o of [1, 3, 6, 8]) {
        expect(jpegInfo(jpegWithOrientation(o, little))).toEqual({
          width: 30,
          height: 20,
          components: 3,
          orientation: o,
        });
      }
    }
  });

  it('rejects data that is not a JPEG', () => {
    expect(jpegInfo(new Uint8Array([1, 2, 3, 4]))).toBeNull();
    expect(jpegInfo(jpeg.slice(0, 12))).toBeNull();
  });
});

describe('placement', () => {
  // Corners of the stored image: top-left is (u 0, v 1), top-right (1, 1), bottom-left (0, 0).
  const corner = (m: number[], u: number, v: number) => [
    m[0] * u + m[2] * v + m[4],
    m[1] * u + m[3] * v + m[5],
  ];

  it('places an upright image on the whole page', () => {
    const { matrix, width, height } = placement(4, 2, 1);
    expect([width, height]).toEqual([4, 2]);
    expect(corner(matrix, 0, 1)).toEqual([0, 2]); // top-left stays top-left (PDF y is up)
    expect(corner(matrix, 1, 0)).toEqual([4, 0]);
  });

  it('turns the page for orientation 6 (rotate 90 clockwise)', () => {
    const { matrix, width, height } = placement(4, 2, 6);
    expect([width, height]).toEqual([2, 4]);
    expect(corner(matrix, 0, 1)).toEqual([2, 4]); // the stored top-left ends up top-right
    expect(corner(matrix, 0, 0)).toEqual([0, 4]); // the stored bottom-left ends up top-left
  });

  it('flips for orientation 2 and turns for 3', () => {
    expect(corner(placement(4, 2, 2).matrix, 0, 1)).toEqual([4, 2]);
    expect(corner(placement(4, 2, 3).matrix, 0, 1)).toEqual([4, 0]);
  });
});

describe('buildPdf', () => {
  const pdf = async () => {
    const rgba = new Uint8Array(4 * 3 * 4).map((_, i) =>
      i % 4 === 3 ? (i < 24 ? 255 : 128) : 100,
    );
    const { rgb, alpha } = splitRgba(rgba);
    return buildPdf([
      { width: 480, height: 360, image: { kind: 'jpeg', data: jpeg, components: 3 } },
      {
        width: 4,
        height: 3,
        image: { kind: 'raw', rgb: await deflate(rgb), alpha: alpha && (await deflate(alpha)) },
      },
    ]);
  };

  it('writes a cross-reference table whose offsets point at the objects', async () => {
    const bytes = await pdf();
    const text = new TextDecoder('latin1').decode(bytes);
    const xref = Number(/startxref\n(\d+)/.exec(text)![1]);
    expect(text.slice(xref, xref + 4)).toBe('xref');
    const entries = [...text.slice(xref).matchAll(/(\d{10}) 00000 n /g)].map((m) => Number(m[1]));
    expect(entries.length).toBeGreaterThan(6);
    entries.forEach((offset, i) => {
      expect(text.slice(offset, offset + 12)).toMatch(new RegExp(`^${i + 1} 0 obj`));
    });
  });

  it('embeds the JPEG bytes unchanged', async () => {
    const bytes = await pdf();
    let found = false;
    for (let i = 0; i < bytes.length - jpeg.length && !found; i++) {
      found = bytes[i] === jpeg[0] && bytes[i + 1] === jpeg[1] && bytes[i + 1000] === jpeg[1000];
    }
    expect(found).toBe(true);
  });

  it('gives each page the size of its image', async () => {
    const text = new TextDecoder('latin1').decode(await pdf());
    expect(text).toContain('/MediaBox [0 0 480 360]');
    expect(text).toContain('/MediaBox [0 0 4 3]');
    expect(text).toContain('/SMask');
  });

  it('passes qpdf when it is installed', async () => {
    const file = join(mkdtempSync(join(tmpdir(), 'pdf-')), 'out.pdf');
    writeFileSync(file, await pdf());
    const r = spawnSync('qpdf', ['--check', file], { encoding: 'utf8' });
    if (r.error) return; // qpdf is optional
    expect(r.stdout + r.stderr).toContain('No syntax or stream encoding errors found');
  });
});

describe('splitRgba', () => {
  it('drops the alpha plane for opaque images', () => {
    expect(splitRgba(new Uint8Array([1, 2, 3, 255, 4, 5, 6, 255])).alpha).toBeUndefined();
    const withAlpha = splitRgba(new Uint8Array([1, 2, 3, 255, 4, 5, 6, 10]));
    expect([...withAlpha.rgb]).toEqual([1, 2, 3, 4, 5, 6]);
    expect([...withAlpha.alpha!]).toEqual([255, 10]);
  });
});
