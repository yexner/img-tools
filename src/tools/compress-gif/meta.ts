import icon from '@tabler/icons/outline/file-zip.svg?raw';
import type { ToolMeta } from '#lib/types';

export default {
  name: 'Compress GIF',
  description: 'Make an animated GIF smaller with fewer colors, fewer frames or a smaller size.',
  category: 'animation',
  spec: '8.4',
  icon,
  accepts: ['gif'],
  batch: false,
  hint: 'Smaller animations',
  keywords: ['reduce', 'shrink', 'animation', 'optimize', 'size', 'frames', 'colors'],
  needs: ['gif'],
} satisfies ToolMeta;
