import icon from '@tabler/icons/outline/slideshow.svg?raw';
import type { ToolMeta } from '#lib/types';

export default {
  name: 'GIF to frames',
  description: 'Split an animated GIF into its frames and save them as PNG pictures.',
  category: 'animation',
  spec: '8.3',
  icon,
  accepts: ['gif'],
  batch: false,
  hint: 'GIF → PNG frames',
  keywords: ['animation', 'extract', 'split', 'png', 'frames', 'each frame'],
  needs: ['gif'],
} satisfies ToolMeta;
