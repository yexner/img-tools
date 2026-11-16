import icon from '@tabler/icons/outline/crop.svg?raw';
import type { ToolMeta } from '#lib/types';

export default {
  name: 'Bulk crop',
  description: 'Crop the same part from many images at once, whatever their sizes.',
  category: 'resize-crop',
  spec: '5.3',
  icon,
  accepts: ['image'],
  batch: true,
  hint: 'Crop many at once',
  keywords: ['batch', 'folder', 'same crop', 'many', 'multiple', 'apply to all'],
} satisfies ToolMeta;
