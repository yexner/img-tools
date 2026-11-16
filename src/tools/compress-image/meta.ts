import icon from '@tabler/icons/outline/arrows-minimize.svg?raw';
import type { ToolMeta } from '#lib/types';

export default {
  name: 'Compress image',
  description: 'Make JPG, PNG, WebP and AVIF images smaller, by quality or down to a size in KB.',
  seoTitle: 'Compress Image to 100KB or Any Size, Free | IMG-TOOLS',
  seoDescription:
    'Compress JPG, PNG, WebP and AVIF images in your browser. Pick a quality or a target size such as 50 KB or 100 KB. Nothing is uploaded.',
  intro:
    'Add one image or many, in any mix of formats, and each keeps its own format unless you choose another. Shrink by quality (about 75 is a good balance for photos) or down to a target size in KB, such as 100 KB for an upload form. Each result shows its new size next to the original.',
  category: 'compress',
  spec: '4.1',
  icon,
  accepts: ['jpeg', 'png', 'webp', 'avif', 'gif'],
  batch: true,
  hint: 'Smaller images',
  keywords: [
    'reduce',
    'shrink',
    'optimize',
    'size',
    'kb',
    'mb',
    'jpg',
    'jpeg',
    'png',
    'webp',
    'avif',
    'under',
    'size limit',
    'upload',
    'target',
    'lossless',
  ],
  needs: ['oxipng', 'webp-enc'],
} satisfies ToolMeta;
