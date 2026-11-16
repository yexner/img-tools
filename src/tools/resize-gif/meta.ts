import icon from '@tabler/icons/outline/arrows-diagonal-minimize-2.svg?raw';
import type { ToolMeta } from '#lib/types';

export default {
  name: 'Resize GIF',
  description: 'Change the size of an animated GIF without touching its timing or colors.',
  category: 'animation',
  spec: '8.5',
  icon,
  accepts: ['gif'],
  batch: false,
  hint: 'Change GIF size',
  keywords: ['scale', 'dimensions', 'pixels', 'animation', 'width', 'height', 'percent'],
  needs: ['gif'],
} satisfies ToolMeta;
