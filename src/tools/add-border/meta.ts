import icon from '@tabler/icons/outline/border-outer.svg?raw';
import type { ToolMeta } from '#lib/types';

export default {
  name: 'Add border',
  description: 'Add a colored or transparent border around images. Nothing is cropped.',
  category: 'resize-crop',
  spec: '5.8',
  icon,
  accepts: ['image'],
  batch: true,
  hint: 'Frame images',
  keywords: ['frame', 'padding', 'margin', 'edge', 'outline', 'transparent'],
} satisfies ToolMeta;
