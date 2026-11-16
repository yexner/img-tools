import type { Help } from '#lib/types';

export default {
  steps: [
    'Add one picture or SVG. A square one with some space around the edges works best.',
    'Move the square box to choose the part to use.',
    'Enter your site name, a short name and a theme color.',
    'Press Create icons. Download the ZIP, put the files in the root folder of your site, and copy the lines into the head of your pages.',
  ],
  faq: [
    {
      q: 'What is in the ZIP?',
      a: '`favicon.ico` with 16, 32 and 48 pixel versions, PNG icons at 16 and 32 pixels, an Apple touch icon at 180 pixels, icons at 192 and 512 pixels for installed web apps, `site.webmanifest`, and `favicon.svg` when you started from an SVG.',
    },
    {
      q: 'Where do the files go?',
      a: 'In the top folder of your website, so that `/favicon.ico` and the other paths in the HTML snippet work. If you put them elsewhere, change the paths in the snippet and in the manifest.',
    },
    {
      q: 'Why is the Apple touch icon not transparent?',
      a: 'iPhones draw black behind a transparent icon. It is placed on white instead. Other icons keep their transparency.',
    },
    {
      q: 'Should I use an SVG?',
      a: 'If you can, yes. An SVG favicon is sharp at every size, and browsers that support it prefer it. The PNG and ICO files cover the rest. The SVG is cut to the box you chose.',
    },
    {
      q: 'What is the theme color?',
      a: 'Mobile browsers use it to color their address bar, and installed web apps use it for their window. Pick the main color of your brand.',
    },
  ],
} satisfies Help;
