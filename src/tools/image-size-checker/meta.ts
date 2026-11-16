import icon from '@tabler/icons/outline/ruler-measure.svg?raw';
import type { ToolMeta } from '#lib/types';

export default {
  name: 'Image size checker',
  description: 'See the real format, dimensions, file size, aspect ratio and DPI of any image.',
  category: 'compress',
  spec: '4.6',
  icon,
  accepts: ['image'],
  batch: true,
  hint: 'Inspect images',
  keywords: [
    'dimensions',
    'width',
    'height',
    'resolution',
    'dpi',
    'megapixels',
    'aspect ratio',
    'info',
  ],
} satisfies ToolMeta;
