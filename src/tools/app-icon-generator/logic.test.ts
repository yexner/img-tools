import { describe, expect, it } from 'vitest';
import { androidLauncher, iosClassic, iosSingle, pixelsOf, playStore } from '#lib/data/icon-sizes';
import { classicContents, classicSizes, layout, singleContents } from './logic';

describe('icon size data', () => {
  it('names an official source and a check date for every group', () => {
    for (const g of [iosSingle, iosClassic, androidLauncher, playStore]) {
      expect(g.source).toMatch(/^https:\/\/developer\.(apple|android)\.com\//);
      expect(g.verified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("has the point sizes of Apple's reference and the sizes Google states", () => {
    expect([...new Set(iosClassic.icons.map((i) => i.points))].sort((a, b) => a - b)).toEqual([
      20, 29, 40, 60, 76, 83.5, 1024,
    ]);
    expect(androidLauncher.icons.map((i) => [i.density, i.px])).toEqual([
      ['mdpi', 48],
      ['hdpi', 72],
      ['xhdpi', 96],
      ['xxhdpi', 144],
      ['xxxhdpi', 192],
    ]);
    expect(playStore.px).toBe(512);
    expect(iosSingle.px).toBe(1024);
  });

  it('follows the density ratio 3:4:6:8:12:16', () => {
    const base = androidLauncher.icons[0].px / 4;
    expect(androidLauncher.icons.map((i) => i.px / base)).toEqual([4, 6, 8, 12, 16]);
  });

  it('gives whole pixel sizes', () => {
    for (const i of iosClassic.icons) expect(Number.isInteger(pixelsOf(i))).toBe(true);
    expect(pixelsOf({ idiom: 'ipad', points: 83.5, scale: 2 })).toBe(167);
    expect(pixelsOf({ idiom: 'iphone', points: 60, scale: 3 })).toBe(180);
  });
});

describe('Contents.json', () => {
  it('single-size set points at one 1024 pixel image', () => {
    const c = JSON.parse(singleContents('icon-1024.png'));
    expect(c.images).toEqual([
      { filename: 'icon-1024.png', idiom: 'universal', platform: 'ios', size: '1024x1024' },
    ]);
    expect(c.info).toEqual({ author: 'xcode', version: 1 });
  });

  it('classic set lists every size and scale, and every file exists in the layout', () => {
    const c = JSON.parse(classicContents());
    expect(c.images).toHaveLength(iosClassic.icons.length);
    expect(c.images[0]).toEqual({
      filename: 'icon-40.png',
      idiom: 'iphone',
      scale: '2x',
      size: '20x20',
    });
    const files = new Set(layout().map((f) => f.path.split('/').pop()));
    for (const img of c.images) expect(files.has(img.filename), img.filename).toBe(true);
    const marketing = c.images.find((i: { idiom: string }) => i.idiom === 'ios-marketing');
    expect(marketing).toMatchObject({ size: '1024x1024', scale: '1x', filename: 'icon-1024.png' });
    expect(c.images.find((i: { size: string }) => i.size === '83.5x83.5')).toMatchObject({
      scale: '2x',
      filename: 'icon-167.png',
    });
  });

  it('shares one file between equal pixel sizes', () => {
    expect(classicSizes()).toEqual([...new Set(classicSizes())]);
    expect(classicSizes()).toContain(40);
  });
});

describe('layout', () => {
  it('has the iOS sets, the five Android densities and the store icon, with unique paths', () => {
    const paths = layout().map((f) => f.path);
    expect(new Set(paths).size).toBe(paths.length);
    expect(paths).toContain('ios/AppIcon.appiconset/Contents.json');
    expect(paths).toContain('android/mipmap-xxxhdpi/ic_launcher.png');
    expect(paths).toContain('store/google-play-icon-512.png');
  });
});
