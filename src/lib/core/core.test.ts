import { describe, expect, it } from 'vitest';
import { acceptAttr, kindFromName, matchesAccepts, sniffBytes } from './formats';
import { formatBytes, percentChange, safeName, splitName, uniqueName } from './names';
import { score, search } from '../fuzzy';

const bytes = (...b: number[]) => new Uint8Array([...b, ...new Array(16).fill(0)]);
const text = (s: string) => new TextEncoder().encode(s.padEnd(16, ' '));

describe('sniffBytes', () => {
  it('detects formats from content', () => {
    expect(sniffBytes(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe('jpeg');
    expect(sniffBytes(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe('png');
    expect(sniffBytes(text('GIF89a'))).toBe('gif');
    expect(sniffBytes(text('RIFF\0\0\0\0WEBPVP8 '))).toBe('webp');
    expect(sniffBytes(text('%PDF-1.7'))).toBe('pdf');
    expect(sniffBytes(text('<svg xmlns="http://www.w3.org/2000/svg"/>'))).toBe('svg');
    expect(sniffBytes(text('\0\0\0\x1cftypheic'))).toBe('heic');
    expect(sniffBytes(text('\0\0\0\x1cftypavif'))).toBe('avif');
    expect(sniffBytes(text('\0\0\0\x1cftypisom'))).toBe('video');
    expect(sniffBytes(text('II*\0\0\0\0\0\0\0\0\0\0'))).toBe('tiff');
  });
  it('returns null for unknown or short input', () => {
    expect(sniffBytes(text('hello world, not an image'))).toBeNull();
    expect(sniffBytes(new Uint8Array(3))).toBeNull();
  });
});

describe('format helpers', () => {
  it('maps names and accepts', () => {
    expect(kindFromName('Photo.JPEG')).toBe('jpeg');
    expect(kindFromName('x.heif')).toBe('heic');
    expect(kindFromName('noext')).toBeNull();
    expect(matchesAccepts('png', ['image'])).toBe(true);
    expect(matchesAccepts('pdf', ['image'])).toBe(false);
    expect(matchesAccepts('webp', ['webp'])).toBe(true);
    expect(acceptAttr(['png'])).toContain('image/png');
  });
});

describe('names', () => {
  it('derives unique output names', () => {
    const taken = new Set<string>();
    expect(uniqueName('holiday.heic', 'compressed', 'jpg', taken)).toBe('holiday-compressed.jpg');
    expect(uniqueName('holiday.png', 'compressed', 'jpg', taken)).toBe('holiday-compressed-2.jpg');
    expect(uniqueName('a.png', undefined, 'jpg', new Set())).toBe('a.jpg');
  });
  it('neutralizes hostile names (zip slip, control chars, reserved names)', () => {
    expect(safeName('../../etc/passwd')).toBe('_.._etc_passwd'.replace('_.._', '_.._'));
    expect(safeName('..')).toBe('file');
    expect(safeName('a\\b/c')).toBe('a_b_c');
    expect(safeName('bad\u0000name\u001f')).toBe('bad_name_');
    expect(safeName('CON')).toBe('_CON');
    expect(safeName('nul')).toBe('_nul');
    expect(safeName('x.')).toBe('x');
    for (const n of ['../x.png', '..\\x.png', 'a/../../b.png', 'C:\\x.png']) {
      const out = uniqueName(n, undefined, 'jpg', new Set());
      expect(out).not.toMatch(/[\\/:]/);
      expect(out.startsWith('.')).toBe(false);
    }
  });
  it('limits very long names', () => {
    expect(uniqueName('x'.repeat(500) + '.png', undefined, 'jpg', new Set()).length).toBeLessThan(
      120,
    );
  });
  it('splits names', () => {
    expect(splitName('dir/photo.final.jpg')).toEqual({ stem: 'photo.final', ext: 'jpg' });
    expect(splitName('.hidden')).toEqual({ stem: 'hidden', ext: '' });
  });
  it('formats sizes and changes', () => {
    expect(formatBytes(999)).toBe('999 B');
    expect(formatBytes(2400000)).toBe('2.4 MB');
    expect(formatBytes(610000)).toBe('610 KB');
    expect(percentChange(1000, 250)).toBe('−75%');
    expect(percentChange(1000, 1040)).toBe('+4%');
  });
});

describe('fuzzy search', () => {
  it('ranks name matches first and ignores non-matches', () => {
    expect(score('xyz', 'compress')).toBe(0);
    const items = [
      { n: 'Compress image', k: 'shrink smaller' },
      { n: 'HEIC to JPG', k: 'iphone' },
      { n: 'Resize image', k: 'scale' },
    ];
    const f = (i: { n: string; k: string }) => [i.n, i.k];
    expect(search('heic', items, f)[0].n).toBe('HEIC to JPG');
    expect(search('iphone', items, f)[0].n).toBe('HEIC to JPG');
    expect(search('cmpr', items, f)[0].n).toBe('Compress image');
    expect(search('', items, f)).toHaveLength(3);
  });
});
