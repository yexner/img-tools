import type { Help } from '#lib/types';

export default {
  steps: [
    'Add one picture. A square one at 1024 pixels or more gives the best result.',
    'Move the square box to choose the part to use, and pick a fill color for iOS.',
    'Press Create icons, download the ZIP, and copy the folders into your project.',
  ],
  faq: [
    {
      q: 'What is in the ZIP?',
      a: 'An iOS icon set with one 1024 pixel image (for current Xcode), a second iOS icon set with every classic size for older projects, Android `mipmap-*` folders for the five common screen densities, and the 512 pixel icon for the Google Play listing.',
    },
    {
      q: 'Why does the picture need a fill color?',
      a: 'iOS app icons must not have transparent areas, so transparency is filled with the color you pick. The Android icons keep their transparency.',
    },
    {
      q: 'Where do the folders go?',
      a: 'Put `AppIcon.appiconset` into your Xcode asset catalog, replacing the existing one. Put the `mipmap-*` folders into `app/src/main/res/` of your Android project.',
    },
    {
      q: 'Do you make Android adaptive icons?',
      a: 'No. Adaptive icons have a separate foreground and background and are not part of this tool. The ordinary launcher icons here work on every Android version.',
    },
    {
      q: 'Where do the sizes come from?',
      a: "From Apple's and Google's own documentation, checked on 25 October 2026. The sources are listed on this page. Platforms change their rules now and then, so check the source if a size matters.",
    },
  ],
} satisfies Help;
