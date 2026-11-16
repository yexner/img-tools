import icon from '@tabler/icons/outline/movie.svg?raw';
import type { ToolMeta } from '#lib/types';

export default {
  name: 'GIF maker',
  description:
    'Turn pictures into an animated GIF. Set the order, the delay, the colors and the looping.',
  category: 'animation',
  spec: '8.1',
  icon,
  accepts: ['image'],
  batch: true,
  hint: 'Pictures → animated GIF',
  keywords: ['animation', 'slideshow', 'create', 'frames', 'loop', 'delay', 'animated'],
  needs: ['gif'],
} satisfies ToolMeta;
