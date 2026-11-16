import icon from '@tabler/icons/outline/typography.svg?raw';
import type { ToolMeta } from '#lib/types';

export default {
  name: 'Text on image',
  description:
    'Add text to a picture. Use as many layers as you like, with fonts, colors and shadows.',
  category: 'creative',
  spec: '10.3',
  icon,
  accepts: ['image'],
  batch: false,
  hint: 'Captions and titles',
  keywords: ['caption', 'title', 'label', 'quote', 'overlay', 'font', 'write', 'annotate'],
  needs: ['serif', 'webp-enc'],
} satisfies ToolMeta;
