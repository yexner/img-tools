import icon from '@tabler/icons/outline/vector.svg?raw';
import type { ToolMeta } from '#lib/types';

export default {
  name: 'SVG optimizer',
  description:
    'Make SVG files smaller by removing editor leftovers and extra detail. The picture looks the same.',
  category: 'developer',
  spec: '9.6',
  icon,
  accepts: ['svg'],
  batch: false,
  hint: 'Smaller SVGs',
  keywords: ['svgo', 'minify', 'vector', 'clean', 'inkscape', 'illustrator', 'markup', 'compress'],
  needs: ['svgo'],
} satisfies ToolMeta;
