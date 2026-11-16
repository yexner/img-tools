import icon from '@tabler/icons/outline/brand-open-source.svg?raw';
import type { ToolMeta } from '#lib/types';

export default {
  name: 'Social preview image',
  description:
    'Design the 1200 × 630 image that shows when a link is shared. Pick a template, add your words.',
  category: 'developer',
  spec: '9.3',
  icon,
  accepts: [],
  batch: false,
  hint: 'og:image maker',
  keywords: [
    'og image',
    'open graph',
    'twitter card',
    'link preview',
    'banner',
    'share image',
    'thumbnail',
    '1200x630',
    'social',
  ],
  needs: ['serif', 'webp-enc'],
} satisfies ToolMeta;
