import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildIco, readIco } from './ico';

const png = new Uint8Array(readFileSync('tests/fixtures/dpi-150.png'));
const tiny = png.subarray(0, 40);

describe('buildIco', () => {
  it('writes a valid header and one directory entry per size, smallest first', () => {
    const ico = buildIco([
      { size: 48, png },
      { size: 16, png: tiny },
      { size: 32, png: tiny },
    ]);
    expect([ico[0], ico[1], ico[2], ico[3]]).toEqual([0, 0, 1, 0]);
    expect(ico[4]).toBe(3);
    const entries = readIco(ico);
    expect(entries.map((e) => e.size)).toEqual([16, 32, 48]);
    expect(entries[2].png).toEqual(png);
    expect(entries[0].png).toEqual(tiny);
  });

  it('points every entry at its own data', () => {
    const ico = buildIco([
      { size: 16, png: tiny },
      { size: 256, png },
    ]);
    const v = new DataView(ico.buffer);
    expect(v.getUint32(6 + 8, true)).toBe(tiny.length);
    expect(v.getUint32(6 + 12, true)).toBe(6 + 32);
    expect(v.getUint32(6 + 16 + 12, true)).toBe(6 + 32 + tiny.length);
    expect(ico.length).toBe(6 + 32 + tiny.length + png.length);
    expect(ico[6 + 16]).toBe(0); // 256 is written as 0
    expect(readIco(ico)[1].size).toBe(256);
  });
});
