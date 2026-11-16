import icon from '@tabler/icons/outline/file-type-pdf.svg?raw';
import type { ToolMeta } from '#lib/types';

export default {
  name: 'PDF to image',
  description:
    'Turn every page of a PDF into a JPG or PNG. Password-protected files are supported.',
  category: 'convert',
  spec: '3.10',
  icon,
  accepts: ['pdf'],
  batch: true,
  hint: 'PDF → JPG, PNG',
  keywords: ['pages', 'render', 'extract', 'password'],
  needs: ['pdfjs'],
} satisfies ToolMeta;
