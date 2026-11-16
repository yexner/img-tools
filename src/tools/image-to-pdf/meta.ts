import icon from '@tabler/icons/outline/file-type-pdf.svg?raw';
import type { ToolMeta } from '#lib/types';

export default {
  name: 'Image to PDF',
  description: 'Combine JPG, PNG and WebP images into one PDF, one image per page.',
  seoTitle: 'Image to PDF Converter: Free, No Upload | IMG-TOOLS',
  seoDescription:
    'Combine JPG, PNG and WebP images into one PDF in your browser. Reorder the pages first. Nothing is uploaded.',
  intro:
    'Add your images, put them in order with the arrows, and download a single PDF with one image per page. Each page takes the exact size of its image, with no margins and no cropping, and JPG images go in without being recompressed. This suits scans and photos of documents, not a layout with paper sizes.',
  category: 'convert',
  spec: '3.9',
  icon,
  accepts: ['jpeg', 'png', 'webp'],
  batch: true,
  hint: 'Images → PDF',
  keywords: ['pdf', 'combine', 'merge', 'pages', 'scan'],
} satisfies ToolMeta;
