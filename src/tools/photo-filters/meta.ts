import icon from '@tabler/icons/outline/adjustments-horizontal.svg?raw';
import type { ToolMeta } from '#lib/types';

export default {
  name: 'Photo filters',
  description:
    'Give a photo a look: warm, cool, vintage, moody, vivid or black and white. Fine-tune and save.',
  category: 'creative',
  spec: '10.4',
  icon,
  accepts: ['image'],
  batch: false,
  hint: 'Looks and tone',
  keywords: [
    'filter',
    'instagram',
    'vintage',
    'black and white',
    'grain',
    'fade',
    'brightness',
    'contrast',
    'saturation',
    'edit',
  ],
  needs: ['webp-enc'],
} satisfies ToolMeta;
