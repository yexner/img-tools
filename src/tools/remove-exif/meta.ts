import icon from '@tabler/icons/outline/eraser.svg?raw';
import type { ToolMeta } from '#lib/types';

export default {
  name: 'Remove EXIF data',
  description: 'Remove location, camera details, dates and color profiles from photos.',
  seoTitle: 'Remove EXIF Data From Photos Online | IMG-TOOLS',
  seoDescription:
    'Remove GPS location, camera details, dates and color profiles from photos in your browser. Nothing is uploaded.',
  intro:
    'Photos can carry the place and time they were taken, the camera model and the editing software. This tool removes all of that by default, and you can clear a box to keep one kind. JPG, PNG and WebP files are cleaned without touching the pixels. You can check the result by adding the cleaned file to the EXIF viewer.',
  category: 'privacy',
  spec: '6.2',
  icon,
  accepts: ['jpeg', 'png', 'webp', 'avif', 'gif', 'bmp', 'tiff', 'heic'],
  batch: true,
  hint: 'Clean photos',
  keywords: [
    'exif',
    'gps',
    'strip',
    'clean',
    'privacy',
    'location',
    'anonymize',
    'scrub',
    'metadata',
  ],
  needs: ['webp-enc'],
} satisfies ToolMeta;
