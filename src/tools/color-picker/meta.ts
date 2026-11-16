import icon from '@tabler/icons/outline/color-picker.svg?raw';
import type { ToolMeta } from '#lib/types';

export default {
  name: 'Color picker',
  description: 'Click anywhere on a picture to read the exact color as hex, RGB and HSL.',
  category: 'developer',
  spec: '9.5',
  icon,
  accepts: ['image'],
  batch: false,
  hint: 'Pick colors',
  keywords: ['eyedropper', 'pixel', 'hex', 'rgb', 'hsl', 'sample', 'magnifier', 'zoom'],
} satisfies ToolMeta;
