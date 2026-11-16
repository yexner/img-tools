import {
  androidLauncher,
  iosClassic,
  iosSingle,
  pixelsOf,
  type IosIcon,
} from '#lib/data/icon-sizes';

const pt = (n: number) => (Number.isInteger(n) ? String(n) : String(n));

/** `Contents.json` for an icon set that uses one 1024 pixel image (current Xcode). */
export function singleContents(fileName: string): string {
  return (
    JSON.stringify(
      {
        images: [
          {
            filename: fileName,
            idiom: 'universal',
            platform: 'ios',
            size: `${iosSingle.px}x${iosSingle.px}`,
          },
        ],
        info: { author: 'xcode', version: 1 },
      },
      null,
      2,
    ) + '\n'
  );
}

/** File name for an icon of a given pixel size in the classic set. Equal sizes share one file. */
const classicFile = (px: number) => `icon-${px}.png`;

/** `Contents.json` for the classic icon set, with every size and scale. */
export function classicContents(): string {
  return (
    JSON.stringify(
      {
        images: iosClassic.icons.map((i: IosIcon) => ({
          filename: classicFile(pixelsOf(i)),
          idiom: i.idiom,
          scale: `${i.scale}x`,
          size: `${pt(i.points)}x${pt(i.points)}`,
        })),
        info: { author: 'xcode', version: 1 },
      },
      null,
      2,
    ) + '\n'
  );
}

/** Distinct pixel sizes of the classic set. */
export const classicSizes = () =>
  [...new Set(iosClassic.icons.map(pixelsOf))].sort((a, b) => a - b);

/** Every file of the ZIP, by path, with the pixel size it holds (null for text files). */
export function layout() {
  return [
    { path: 'ios/AppIcon.appiconset/Contents.json', px: null },
    { path: `ios/AppIcon.appiconset/icon-${iosSingle.px}.png`, px: iosSingle.px },
    { path: 'ios-classic/AppIcon.appiconset/Contents.json', px: null },
    ...classicSizes().map((px) => ({
      path: `ios-classic/AppIcon.appiconset/${classicFile(px)}`,
      px,
    })),
    ...androidLauncher.icons.map((i) => ({
      path: `android/mipmap-${i.density}/ic_launcher.png`,
      px: i.px,
    })),
    { path: 'store/google-play-icon-512.png', px: 512 },
  ];
}
