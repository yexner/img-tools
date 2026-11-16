import icon from '@tabler/icons/outline/ruler-2.svg?raw';
import type { ToolMeta } from '#lib/types';

export default {
  name: 'Resize to cm or mm',
  description:
    'Size photos for printing in cm, mm or inches, with the print resolution stored in the file.',
  category: 'resize-crop',
  spec: '5.5',
  icon,
  accepts: ['jpeg', 'png', 'webp', 'avif'],
  batch: true,
  hint: 'Print sizes',
  keywords: [
    'print',
    'dpi',
    'a4',
    'letter',
    '4x6',
    '5x7',
    'centimeters',
    'millimeters',
    'inches',
    'physical',
  ],
} satisfies ToolMeta;
