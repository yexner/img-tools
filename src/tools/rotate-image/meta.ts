import icon from '@tabler/icons/outline/rotate-clockwise-2.svg?raw';
import type { ToolMeta } from '#lib/types';

export default {
  name: 'Rotate & flip',
  description: 'Turn images in 90° steps and flip them left to right or top to bottom.',
  category: 'resize-crop',
  spec: '5.6',
  icon,
  accepts: ['image'],
  batch: true,
  hint: 'Rotate, flip',
  keywords: ['turn', 'mirror', 'sideways', 'upside down', 'orientation', '90'],
} satisfies ToolMeta;
