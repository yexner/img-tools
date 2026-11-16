import icon from '@tabler/icons/outline/layout-grid.svg?raw';
import type { ToolMeta } from '#lib/types';

export default {
  name: 'Photo collage',
  description:
    'Put several photos into one picture, in a grid with a gap, margin and background color.',
  category: 'resize-crop',
  spec: '5.9',
  icon,
  accepts: ['image'],
  batch: true,
  hint: 'Grid of photos',
  keywords: ['grid', 'combine', 'merge', 'mosaic', 'montage', 'layout'],
} satisfies ToolMeta;
