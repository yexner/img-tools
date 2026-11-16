import icon from '@tabler/icons/outline/app-window.svg?raw';
import type { ToolMeta } from '#lib/types';

export default {
  name: 'Favicon generator',
  description:
    'Make every favicon and web app icon a site needs from one picture, with the HTML to use them.',
  seoTitle: 'Favicon Generator: favicon.ico and App Icons | IMG-TOOLS',
  seoDescription:
    'Make favicon.ico, PNG, Apple touch icon and web app icons from one picture or SVG, plus the HTML to use them. No upload.',
  intro:
    'Add a square picture or an SVG and download a ZIP with favicon.ico (16, 32 and 48 px), PNG icons, a 180 px Apple touch icon, 192 and 512 px app icons and a site.webmanifest. You also get the lines to paste into your page head. The Apple icon is placed on white because iPhones draw black behind transparency.',
  category: 'developer',
  spec: '9.1',
  icon,
  accepts: ['image'],
  batch: false,
  hint: 'Picture → favicon.ico + icons',
  keywords: [
    'ico',
    'apple touch icon',
    'manifest',
    'web app',
    'site icon',
    'tab icon',
    'pwa',
    '512',
    '192',
  ],
} satisfies ToolMeta;
