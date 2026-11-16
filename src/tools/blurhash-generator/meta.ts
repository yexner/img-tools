import icon from '@tabler/icons/outline/blur.svg?raw';
import type { ToolMeta } from '#lib/types';

export default {
  name: 'BlurHash placeholder',
  description:
    'Make a tiny BlurHash text, CSS gradient or data URI that stands in for an image while it loads.',
  category: 'developer',
  spec: '9.8',
  icon,
  accepts: ['image'],
  batch: false,
  hint: 'Image placeholders',
  keywords: [
    'placeholder',
    'lazy loading',
    'hash',
    'blur',
    'preview',
    'low quality',
    'lqip',
    'web',
  ],
} satisfies ToolMeta;
