import icon from '@tabler/icons/outline/arrows-exchange.svg?raw';
import type { ToolMeta } from '#lib/types';

export default {
  name: 'Convert image',
  description:
    'Convert HEIC, PNG, JPG, WebP, AVIF, TIFF, BMP and GIF images to JPG, PNG, WebP or AVIF.',
  seoTitle: 'Convert Images: HEIC, PNG, JPG, WebP, AVIF | IMG-TOOLS',
  seoDescription:
    'Convert HEIC, PNG, JPG, WebP, AVIF, TIFF and BMP images to JPG, PNG, WebP or AVIF in your browser. Mix formats in one batch. Nothing is uploaded.',
  intro:
    'Add images in any mix of formats, including iPhone HEIC photos, and choose the format to save them as: JPG, PNG, WebP or AVIF. Set the quality once and it applies to the whole batch, and a multi-page TIFF becomes one file per page. Everything runs in your browser.',
  category: 'convert',
  spec: '3.1',
  icon,
  accepts: ['jpeg', 'png', 'webp', 'avif', 'gif', 'bmp', 'tiff', 'heic'],
  batch: true,
  hint: 'Any image → JPG, PNG, WebP, AVIF',
  keywords: [
    'heic',
    'webp',
    'avif',
    'png',
    'jpg',
    'jpeg',
    'tiff',
    'tif',
    'bmp',
    'iphone',
    'heif',
    'gif',
    'convert',
    'format',
    'transparent',
  ],
  needs: ['heic', 'tiff'],
} satisfies ToolMeta;
