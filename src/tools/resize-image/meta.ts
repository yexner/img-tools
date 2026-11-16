import icon from '@tabler/icons/outline/arrows-diagonal-minimize-2.svg?raw';
import type { ToolMeta } from '#lib/types';

export default {
  name: 'Resize image',
  description:
    'Change the size of JPG, PNG, WebP and AVIF images by longest edge, exact size or percent.',
  seoTitle: 'Resize Image: By Pixels, Percent or Longest Edge | IMG-TOOLS',
  seoDescription:
    'Resize JPG, PNG, WebP and AVIF images by longest edge, exact width and height, or percent. Batch support, no upload.',
  intro:
    'Set the longest edge (for example 1600 px) and every picture is scaled to fit while keeping its shape, and pictures that are already smaller are left alone. You can also type an exact width and height, or a percent. Turn off keep proportions only if you want the picture stretched.',
  category: 'resize-crop',
  spec: '5.1',
  icon,
  accepts: ['jpeg', 'png', 'webp', 'avif'],
  batch: true,
  hint: 'Change size',
  keywords: ['scale', 'shrink', 'enlarge', 'dimensions', 'pixels', 'width', 'height', 'percent'],
} satisfies ToolMeta;
