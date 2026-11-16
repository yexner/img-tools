import icon from '@tabler/icons/outline/crop.svg?raw';
import type { ToolMeta } from '#lib/types';

export default {
  name: 'Crop image',
  description: 'Crop images to a rectangle, circle or oval, with ratios and exact pixel values.',
  category: 'resize-crop',
  spec: '5.2',
  icon,
  accepts: ['image'],
  batch: true,
  hint: 'Crop pictures',
  keywords: [
    'cut',
    'trim',
    'aspect ratio',
    'square',
    '16:9',
    'frame',
    'select',
    'round',
    'avatar',
    'circle',
    'oval',
    'ellipse',
    'transparent',
  ],
} satisfies ToolMeta;
