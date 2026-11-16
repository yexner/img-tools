import icon from '@tabler/icons/outline/droplet-half-2.svg?raw';
import type { ToolMeta } from '#lib/types';

export default {
  name: 'Add watermark',
  description:
    'Put your text or logo on pictures, in the place you choose, at a size that fits each one.',
  category: 'watermark',
  spec: '7.1',
  icon,
  accepts: ['image'],
  batch: true,
  hint: 'Text or logo on images',
  keywords: ['logo', 'copyright', 'stamp', 'text', 'brand', 'protect', 'signature'],
} satisfies ToolMeta;
