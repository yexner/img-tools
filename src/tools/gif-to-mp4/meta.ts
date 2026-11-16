import icon from '@tabler/icons/outline/movie.svg?raw';
import type { ToolMeta } from '#lib/types';

export default {
  name: 'GIF to MP4',
  description: 'Turn an animated GIF into a much smaller MP4 video.',
  category: 'animation',
  spec: '8.6',
  icon,
  accepts: ['gif'],
  batch: false,
  hint: 'GIF → MP4',
  keywords: ['video', 'convert', 'smaller', 'h264', 'animation', 'mp4'],
  needs: ['mp4'],
} satisfies ToolMeta;
