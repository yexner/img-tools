import icon from '@tabler/icons/outline/grid-dots.svg?raw';
import type { ToolMeta } from '#lib/types';

export default {
  name: 'Tiled watermark',
  description:
    'Repeat your text or logo across the whole picture, so there is no clean corner to crop.',
  category: 'watermark',
  spec: '7.2',
  icon,
  accepts: ['image'],
  batch: true,
  hint: 'Repeat across the picture',
  keywords: ['repeat', 'pattern', 'diagonal', 'proof', 'draft', 'protect', 'stamp'],
} satisfies ToolMeta;
