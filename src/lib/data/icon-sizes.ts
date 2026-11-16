// App icon sizes for iOS and Android. Every entry names the official page it comes from and the day it was
// checked. Nothing here is guessed.
//
// MISSING: which size and scale pairs Xcode offers in a new project is not listed on the pages below; the
//   classic iOS set follows the point sizes of Apple's asset-catalog reference and the standard pairs.
//   Re-check against a fresh Xcode project.
// MISSING: Android launcher icon pixel sizes are given by Android's density rule (3:4:6:8:12:16 from 48 px for
//   mdpi), which that page states for bitmaps in general, not for launcher icons only.

export interface IosIcon {
  /** `iphone`, `ipad` or `ios-marketing`. */
  idiom: 'iphone' | 'ipad' | 'ios-marketing';
  /** Size in points, as written in Contents.json: `60x60`, `83.5x83.5`. */
  points: number;
  scale: 1 | 2 | 3;
}

interface AndroidIcon {
  density: 'mdpi' | 'hdpi' | 'xhdpi' | 'xxhdpi' | 'xxxhdpi';
  px: number;
}

const CHECKED = '2026-10-25';

/** Apple: one 1024 x 1024 image is enough for iOS and iPadOS in current Xcode. */
export const iosSingle = {
  px: 1024,
  source: 'https://developer.apple.com/documentation/xcode/configuring-your-app-icon',
  verified: CHECKED,
};

/** Apple's asset-catalog reference lists these point sizes; scales follow the standard Xcode set. */
export const iosClassic = {
  source:
    'https://developer.apple.com/library/archive/documentation/Xcode/Reference/xcode_ref-Asset_Catalog_Format/AppIconType.html',
  verified: CHECKED,
  icons: [
    { idiom: 'iphone', points: 20, scale: 2 },
    { idiom: 'iphone', points: 20, scale: 3 },
    { idiom: 'iphone', points: 29, scale: 2 },
    { idiom: 'iphone', points: 29, scale: 3 },
    { idiom: 'iphone', points: 40, scale: 2 },
    { idiom: 'iphone', points: 40, scale: 3 },
    { idiom: 'iphone', points: 60, scale: 2 },
    { idiom: 'iphone', points: 60, scale: 3 },
    { idiom: 'ipad', points: 20, scale: 1 },
    { idiom: 'ipad', points: 20, scale: 2 },
    { idiom: 'ipad', points: 29, scale: 1 },
    { idiom: 'ipad', points: 29, scale: 2 },
    { idiom: 'ipad', points: 40, scale: 1 },
    { idiom: 'ipad', points: 40, scale: 2 },
    { idiom: 'ipad', points: 76, scale: 1 },
    { idiom: 'ipad', points: 76, scale: 2 },
    { idiom: 'ipad', points: 83.5, scale: 2 },
    { idiom: 'ios-marketing', points: 1024, scale: 1 },
  ] as IosIcon[],
};

/** Android: icons for the five common densities, in `mipmap-*` folders. */
export const androidLauncher = {
  source: 'https://developer.android.com/training/multiscreen/screendensities',
  verified: CHECKED,
  icons: [
    { density: 'mdpi', px: 48 },
    { density: 'hdpi', px: 72 },
    { density: 'xhdpi', px: 96 },
    { density: 'xxhdpi', px: 144 },
    { density: 'xxxhdpi', px: 192 },
  ] as AndroidIcon[],
};

/** Google Play: a 512 x 512 px, 32-bit PNG in sRGB, up to 1024 KB. */
export const playStore = {
  px: 512,
  source:
    'https://developer.android.com/distribute/google-play/resources/icon-design-specifications',
  verified: CHECKED,
};

/** Pixel size of an iOS icon: points times scale. */
export const pixelsOf = (i: IosIcon) => Math.round(i.points * i.scale);
