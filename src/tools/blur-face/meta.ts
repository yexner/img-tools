import icon from '@tabler/icons/outline/blur.svg?raw';
import type { ToolMeta } from '#lib/types';

export default {
  name: 'Blur faces & areas',
  description: 'Blur or pixelate faces, plates and other areas, in boxes or ovals you choose.',
  category: 'privacy',
  spec: '6.4',
  icon,
  accepts: ['image'],
  batch: true,
  hint: 'Hide parts of a picture',
  keywords: [
    'blur',
    'pixelate',
    'face',
    'plate',
    'hide',
    'censor',
    'mosaic',
    'anonymize',
    'privacy',
    'oval',
    'round',
    'ellipse',
  ],
} satisfies ToolMeta;
