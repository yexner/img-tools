import icon from '@tabler/icons/outline/layout-board.svg?raw';
import type { ToolMeta } from '#lib/types';

export default {
  name: 'Sprite sheet generator',
  description: 'Combine many small images into one sprite sheet, with the CSS to use each one.',
  category: 'developer',
  spec: '9.7',
  icon,
  accepts: ['image'],
  batch: true,
  hint: 'Images → sprite + CSS',
  keywords: ['css sprite', 'icons', 'atlas', 'texture', 'background-position', 'retina', 'combine'],
} satisfies ToolMeta;
