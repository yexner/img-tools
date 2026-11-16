import icon from '@tabler/icons/outline/palette.svg?raw';
import type { ToolMeta } from '#lib/types';

export default {
  name: 'Color palette extractor',
  description: 'Find the main colors of a picture, with hex, RGB and HSL values you can copy.',
  category: 'developer',
  spec: '9.4',
  icon,
  accepts: ['image'],
  batch: false,
  hint: 'Colors of a picture',
  keywords: [
    'colors',
    'swatches',
    'dominant',
    'theme',
    'hex',
    'rgb',
    'hsl',
    'tailwind',
    'css variables',
    'palette',
  ],
} satisfies ToolMeta;
